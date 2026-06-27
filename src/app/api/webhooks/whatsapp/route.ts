import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  parseStatusUpdates,
} from '@/lib/providers/whatsapp'

// WhatsApp delivery-receipt webhook (Milestone 13). Meta calls this endpoint with
// status updates (sent → delivered → read / failed) keyed by the message id we stored
// as provider_message_id. This route is necessarily unauthenticated (no session), so
// the X-Hub-Signature-256 HMAC IS the auth — we reject anything we can't verify.
//
// Updating notifications.status auto-fires the M12 timeline trigger, so the customer's
// /policy timeline reflects delivery for free. Forward-only + append-only delivery_logs
// make Meta's redeliveries idempotent.

export const dynamic = 'force-dynamic'

// GET — Meta verification handshake.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const challenge = verifyWebhookChallenge(params)
  if (challenge) return new Response(challenge, { status: 200 })
  return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 403 })
}

// Status rank for forward-only progression (never regress sent→pending, etc.).
const RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 }

export async function POST(request: Request) {
  const raw = await request.text() // raw body required for signature verification
  if (!verifyWebhookSignature(raw, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ ok: false, error: 'Bad signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const updates = parseStatusUpdates(payload)
  const admin = createAdminClient()
  let applied = 0

  for (const u of updates) {
    const incoming = u.status // sent | delivered | read | failed
    const { data: notif } = await admin
      .from('notifications')
      .select('id, status')
      .eq('provider_message_id', u.providerMessageId)
      .maybeSingle()
    if (!notif) continue // unknown id (or not ours) — ack and ignore

    const current = notif.status as string
    const isFailed = incoming === 'failed'
    const advances = RANK[incoming] !== undefined && (RANK[incoming] ?? -1) > (RANK[current] ?? -1)
    if (!isFailed && !advances) continue // duplicate / out-of-order — idempotent no-op

    await admin
      .from('notifications')
      .update({ status: incoming as never })
      .eq('id', notif.id)
    await admin.from('delivery_logs').insert({
      notification_id: notif.id,
      status: incoming as never,
      attempt: 1,
      detail: `webhook: ${incoming}`,
      provider_response: u as never,
    })
    applied++
  }

  return NextResponse.json({ ok: true, applied })
}
