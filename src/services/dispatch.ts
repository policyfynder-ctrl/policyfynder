import { createAdminClient } from '@/lib/supabase/admin'
import { renderTemplateString, missingVariables } from '@/lib/templates'
import { sendEmail } from '@/lib/providers/graph'
import { sendWhatsApp } from '@/lib/providers/whatsapp'
import { isDryRun } from '@/lib/providers/types'

// Communication dispatcher (Milestone 13). Driven by the Vercel-Cron route
// (/api/cron/dispatch). Runs with the SERVICE ROLE — it sends on behalf of the
// system and must bypass RLS. It is the ONLY component that writes provider data.
//
// Flow per cycle:
//   1. claim_due_notifications() atomically hands us due rows (FOR UPDATE SKIP LOCKED)
//      so overlapping cron runs never double-send.
//   2. For each row: re-validate template variables, RE-CHECK live consent (it may
//      have been revoked since queueing), render subject/body, send via the channel
//      adapter (dry-run by default this milestone).
//   3. Success → status='sent', sent_at, provider_message_id; append delivery_logs.
//      Retryable failure → retry_count++, next_retry_at (backoff), claimed_at=NULL so
//      it can be re-claimed; terminal failure → mark failed, retries exhausted.
//   In-app messages are never claimed (they need no external dispatch).

const RETRY_BASE_MS = 2 * 60 * 1000 // 2m → 4m → 8m (× 2^retry_count)

export type DispatchSummary = {
  claimed: number
  sent: number
  failed: number
  skipped: number
  dryRun: boolean
}

type ClaimedRow = {
  id: string
  recipient_id: string
  channel: string
  status: string
  payload: Record<string, string> | null
  template_ref_id: string | null
  policy_id: string | null
  retry_count: number
  max_retries: number
}

export async function runDispatchCycle(limit = 25): Promise<DispatchSummary> {
  const admin = createAdminClient()
  const summary: DispatchSummary = { claimed: 0, sent: 0, failed: 0, skipped: 0, dryRun: isDryRun() }

  const { data: claimed, error } = await admin.rpc('claim_due_notifications', { p_limit: limit })
  if (error || !claimed) return summary
  const rows = claimed as unknown as ClaimedRow[]
  summary.claimed = rows.length
  if (rows.length === 0) return summary

  for (const row of rows) {
    const outcome = await dispatchOne(admin, row)
    if (outcome === 'sent') summary.sent++
    else if (outcome === 'failed') summary.failed++
    else summary.skipped++
  }
  return summary
}

type Admin = ReturnType<typeof createAdminClient>

async function dispatchOne(admin: Admin, row: ClaimedRow): Promise<'sent' | 'failed' | 'skipped'> {
  const vars = row.payload ?? {}

  // --- Template ---
  if (!row.template_ref_id) {
    return fail(admin, row, false, 'No template attached to message.')
  }
  const { data: tpl } = await admin
    .from('notification_templates')
    .select('channel, language, subject, body, external_template_id, required_variables')
    .eq('id', row.template_ref_id)
    .maybeSingle()
  if (!tpl) return fail(admin, row, false, 'Template not found.')

  const missing = missingVariables((tpl.required_variables as string[]) ?? [], vars)
  if (missing.length) return fail(admin, row, false, `Missing variables: ${missing.join(', ')}.`)

  // --- Live consent re-check (in_app is excluded by the claim query) ---
  const consented = await hasConsent(admin, row.recipient_id, row.channel)
  if (!consented) return fail(admin, row, false, `Recipient is no longer opted in to ${row.channel}.`)

  // --- Recipient contact (policy holder contact wins; fall back to profile) ---
  const contact = await resolveContact(admin, row)

  // --- Send via channel adapter ---
  let result
  if (row.channel === 'email') {
    result = await sendEmail({
      to: contact.email ?? '',
      subject: renderTemplateString(tpl.subject, vars),
      body: renderTemplateString(tpl.body, vars),
    })
  } else if (row.channel === 'whatsapp') {
    result = await sendWhatsApp({
      to: contact.phone ?? '',
      templateName: tpl.external_template_id ?? '',
      language: tpl.language ?? 'en',
      variables: (tpl.required_variables as string[] ?? []).map((k) => vars[k] ?? ''),
    })
  } else if (row.channel === 'sms') {
    // SMS provider deferred — fail terminally so it never blocks the queue.
    return fail(admin, row, false, 'SMS channel is not implemented.')
  } else {
    return fail(admin, row, false, `Unsupported channel: ${row.channel}.`)
  }

  if (result.ok) {
    await admin
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString(), provider_message_id: result.providerMessageId, error_message: null })
      .eq('id', row.id)
    await log(admin, row, 'sent', result.providerMessageId, { dryRun: result.dryRun })
    return 'sent'
  }
  return fail(admin, row, result.retryable, result.error, result.raw)
}

/** Record a failure: back off + re-queue if retryable & retries remain, else terminal. */
async function fail(
  admin: Admin,
  row: ClaimedRow,
  retryable: boolean,
  message: string,
  raw?: unknown
): Promise<'failed'> {
  const nextCount = row.retry_count + 1
  const willRetry = retryable && nextCount < row.max_retries
  const nextRetryAt = willRetry
    ? new Date(Date.now() + RETRY_BASE_MS * Math.pow(2, row.retry_count)).toISOString()
    : null

  await admin
    .from('notifications')
    .update({
      status: 'failed',
      retry_count: willRetry ? nextCount : row.max_retries, // exhaust on terminal failure
      next_retry_at: nextRetryAt,
      error_message: message,
      claimed_at: null, // release so a retryable row can be re-claimed after backoff
    })
    .eq('id', row.id)

  await log(admin, row, 'failed', null, { error: message, retryable: willRetry, raw })
  return 'failed'
}

async function log(
  admin: Admin,
  row: ClaimedRow,
  status: 'sent' | 'failed',
  providerMessageId: string | null,
  detail: Record<string, unknown>
): Promise<void> {
  await admin.from('delivery_logs').insert({
    notification_id: row.id,
    status,
    attempt: row.retry_count + 1,
    detail: providerMessageId ?? (typeof detail.error === 'string' ? detail.error : null),
    provider_response: detail as never,
  })
}

async function hasConsent(admin: Admin, recipientId: string, channel: string): Promise<boolean> {
  const { data } = await admin
    .from('communication_preferences')
    .select('email_opt_in, whatsapp_opt_in, sms_opt_in')
    .eq('profile_id', recipientId)
    .maybeSingle()
  // Same defaults as the queue-time consent trigger: email on, whatsapp/sms off.
  if (!data) return channel === 'email'
  if (channel === 'email') return data.email_opt_in
  if (channel === 'whatsapp') return data.whatsapp_opt_in
  if (channel === 'sms') return data.sms_opt_in
  return false
}

async function resolveContact(
  admin: Admin,
  row: ClaimedRow
): Promise<{ email: string | null; phone: string | null }> {
  let email: string | null = null
  let phone: string | null = null
  if (row.policy_id) {
    const { data: p } = await admin
      .from('policies')
      .select('holder_email, holder_phone')
      .eq('id', row.policy_id)
      .maybeSingle()
    email = p?.holder_email ?? null
    phone = p?.holder_phone ?? null
  }
  if (!email || !phone) {
    const { data: prof } = await admin
      .from('profiles')
      .select('email, phone')
      .eq('id', row.recipient_id)
      .maybeSingle()
    email = email ?? prof?.email ?? null
    phone = phone ?? prof?.phone ?? null
  }
  return { email, phone }
}
