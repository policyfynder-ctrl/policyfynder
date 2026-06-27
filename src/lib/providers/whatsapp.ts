import crypto from 'node:crypto'
import { type SendResult, isDryRun, dryRunMessageId } from './types'

// WhatsApp Business Cloud API adapter (Milestone 13). Sends pre-approved TEMPLATE
// messages via POST graph.facebook.com/{version}/{phone_number_id}/messages and
// verifies inbound delivery webhooks. Unlike email, WhatsApp gives a real lifecycle
// (sent → delivered → read / failed) through the status webhook.
//
// DRY-RUN BY DEFAULT this milestone: no message is sent unless
// COMMUNICATIONS_DRY_RUN='false' AND creds are present.

type WhatsAppConfig = {
  phoneNumberId: string
  accessToken: string
  apiVersion: string
}

function readConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return null
  return { phoneNumberId, accessToken, apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0' }
}

export type WhatsAppInput = {
  to: string // E.164 phone, e.g. 919876543210
  templateName: string // Meta-approved template name (external_template_id)
  language: string
  variables: string[] // ordered body parameters
}

/** Send a WhatsApp template message (or simulate it in dry-run). Never throws. */
export async function sendWhatsApp(input: WhatsAppInput): Promise<SendResult> {
  if (!input.to) {
    return { ok: false, retryable: false, error: 'Recipient has no phone number.' }
  }
  if (!input.templateName) {
    return { ok: false, retryable: false, error: 'WhatsApp template has no approved template name.' }
  }

  if (isDryRun()) {
    return { ok: true, providerMessageId: dryRunMessageId('whatsapp'), dryRun: true }
  }

  const cfg = readConfig()
  if (!cfg) {
    return { ok: false, retryable: true, error: 'WhatsApp Cloud API is not configured.' }
  }

  const components = input.variables.length
    ? [{ type: 'body', parameters: input.variables.map((v) => ({ type: 'text', text: v })) }]
    : []

  try {
    const res = await fetch(
      `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: input.to,
          type: 'template',
          template: {
            name: input.templateName,
            language: { code: input.language || 'en' },
            components,
          },
        }),
      }
    )
    const json = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[]
      error?: { message?: string }
    }
    if (res.ok && json.messages?.[0]?.id) {
      return { ok: true, providerMessageId: json.messages[0].id, dryRun: false }
    }
    const retryable = res.status === 429 || res.status >= 500
    return {
      ok: false,
      retryable,
      error: json.error?.message || `WhatsApp send failed (${res.status})`,
      raw: json,
    }
  } catch (e) {
    return { ok: false, retryable: true, error: e instanceof Error ? e.message : 'WhatsApp network error' }
  }
}

// ===== Webhook helpers =====

/**
 * GET handshake: Meta calls with hub.mode/hub.verify_token/hub.challenge. Echo the
 * challenge only when the token matches WHATSAPP_VERIFY_TOKEN.
 */
export function verifyWebhookChallenge(params: URLSearchParams): string | null {
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')
  const expected = process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === 'subscribe' && expected && token === expected && challenge) return challenge
  return null
}

/**
 * POST authenticity: verify the X-Hub-Signature-256 header (sha256=<hex hmac of the
 * raw body with WHATSAPP_APP_SECRET>). This route is unauthenticated by necessity, so
 * the signature is the only trust anchor — reject anything that doesn't match.
 * Uses a constant-time comparison to avoid leaking via timing.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !signatureHeader) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export type WebhookStatus = { providerMessageId: string; status: string }

/** Flatten a WhatsApp webhook payload into the status updates it carries. */
export function parseStatusUpdates(payload: unknown): WebhookStatus[] {
  const out: WebhookStatus[] = []
  const body = payload as {
    entry?: { changes?: { value?: { statuses?: { id?: string; status?: string }[] } }[] }[]
  }
  for (const entry of body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const s of change.value?.statuses ?? []) {
        if (s.id && s.status) out.push({ providerMessageId: s.id, status: s.status })
      }
    }
  }
  return out
}
