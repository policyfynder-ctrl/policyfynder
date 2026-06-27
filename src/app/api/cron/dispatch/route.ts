import { NextResponse } from 'next/server'
import { runDispatchCycle } from '@/services/dispatch'

// Communication dispatcher cron (Milestone 13). Invoked by Vercel Cron (see
// vercel.json). This is a SYSTEM job, not a user action — it authenticates with a
// shared CRON_SECRET (Vercel Cron sends it as `Authorization: Bearer <secret>`),
// not a session. The dispatch service runs with the service role and is the only
// place that talks to providers. Dry-run by default — no live customer messages.
//
// If CRON_SECRET is unset we refuse rather than expose an open trigger.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const n = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(n) && n > 0 && n <= 200 ? Math.floor(n) : 25

  const summary = await runDispatchCycle(limit)
  return NextResponse.json({ ok: true, ...summary })
}

// Vercel Cron issues GET; allow POST too for manual/operational triggers.
export const GET = handle
export const POST = handle
