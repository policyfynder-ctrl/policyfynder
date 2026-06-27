import { type SendResult, isDryRun, dryRunMessageId } from './types'

// Microsoft Graph email adapter (Milestone 13). App-only (client-credentials) OAuth2
// → POST /users/{sender}/sendMail. Graph confirms ACCEPTANCE (HTTP 202), not delivery,
// so for email we treat a 202 as the terminal success state (status='sent'); there is
// no delivered/read webhook for email (that lifecycle is WhatsApp-only).
//
// DRY-RUN BY DEFAULT this milestone: no token is fetched and no mail is sent unless
// COMMUNICATIONS_DRY_RUN='false' AND all creds are present.

type GraphConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  sender: string
}

function readConfig(): GraphConfig | null {
  const tenantId = process.env.GRAPH_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET
  const sender = process.env.GRAPH_SENDER
  if (!tenantId || !clientId || !clientSecret || !sender) return null
  return { tenantId, clientId, clientSecret, sender }
}

// Small in-process token cache (worker lives for the duration of one cron cycle, but
// a warm serverless instance may handle several — avoid re-minting every call).
let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(cfg: GraphConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Graph token request failed (${res.status})`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

export type EmailInput = {
  to: string
  subject: string
  body: string // rendered text/HTML
}

/** Send an email via Graph (or simulate it in dry-run). Never throws — returns SendResult. */
export async function sendEmail(input: EmailInput): Promise<SendResult> {
  if (!input.to || !input.to.includes('@')) {
    return { ok: false, retryable: false, error: 'Recipient has no valid email address.' }
  }

  if (isDryRun()) {
    return { ok: true, providerMessageId: dryRunMessageId('email'), dryRun: true }
  }

  const cfg = readConfig()
  if (!cfg) {
    // Misconfiguration is operator-fixable, not a per-message fault — retry later.
    return { ok: false, retryable: true, error: 'Microsoft Graph is not configured.' }
  }

  try {
    const token = await getAccessToken(cfg)
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.sender)}/sendMail`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: input.subject,
            body: { contentType: 'HTML', content: input.body },
            toRecipients: [{ emailAddress: { address: input.to } }],
          },
          saveToSentItems: false,
        }),
      }
    )
    if (res.status === 202) {
      // Graph does not return a message id on sendMail; synthesise a correlation id.
      return { ok: true, providerMessageId: `graph-${Date.now()}`, dryRun: false }
    }
    const detail = await res.text().catch(() => '')
    // 429 / 5xx are transient; 4xx (except 429) are permanent.
    const retryable = res.status === 429 || res.status >= 500
    return { ok: false, retryable, error: `Graph sendMail failed (${res.status})`, raw: detail }
  } catch (e) {
    return { ok: false, retryable: true, error: e instanceof Error ? e.message : 'Graph network error' }
  }
}
