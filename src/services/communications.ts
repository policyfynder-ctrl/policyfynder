import { createClient } from '@/lib/supabase/server'
import { missingVariables } from '@/lib/templates'

// Communication queue access (migration 026). Queue-only — messages are inserted
// at status='pending'; the M13 Edge-Function worker dispatches them. Session/RLS
// client only: staff insert is gated by notifications_insert_staff + the strict
// consent trigger; reads are RLS-scoped. No admin client, no provider calls.

export type TemplateRow = {
  id: string
  name: string
  channel: 'email' | 'whatsapp' | 'sms' | 'in_app'
  category: string | null
  subject: string | null
  body: string | null
  required_variables: string[]
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_templates')
    .select('id, name, channel, category, subject, body, required_variables')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('channel', { ascending: true })
  if (error) return []
  return (data ?? []) as unknown as TemplateRow[]
}

export type ComposeTarget = {
  policy_id: string
  policy_number: string
  customer_profile_id: string
  holder_name: string
}

/** Accessible policies that have a LINKED customer account (a valid message recipient). */
export async function listComposableTargets(): Promise<ComposeTarget[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('policies')
    .select('id, policy_number, customer_profile_id, holder_name')
    .is('deleted_at', null)
    .not('customer_profile_id', 'is', null)
    .order('policy_number', { ascending: true })
  if (error) return []
  return (data ?? []).map((p) => ({
    policy_id: p.id as string,
    policy_number: p.policy_number as string,
    customer_profile_id: p.customer_profile_id as string,
    holder_name: p.holder_name as string,
  }))
}

export type ComposeTargetFull = ComposeTarget & {
  allowedChannels: string[]
  blockedChannels: string[]
}

/** Targets enriched with the recipient's allowed channels (in_app always allowed). */
export async function listComposeTargets(): Promise<ComposeTargetFull[]> {
  const targets = await listComposableTargets()
  const out: ComposeTargetFull[] = []
  for (const t of targets) {
    const prefs = await getRecipientPrefs(t.customer_profile_id)
    const allowed = ['in_app']
    const blocked: string[] = []
    for (const ch of ['email', 'whatsapp', 'sms'] as const) {
      const def = ch === 'email' // email defaults to opted-in, whatsapp/sms require explicit
      const on = prefs ? prefs[`${ch}_opt_in` as keyof typeof prefs] : def
      if (on) allowed.push(ch)
      else blocked.push(ch)
    }
    out.push({ ...t, allowedChannels: allowed, blockedChannels: blocked })
  }
  return out
}

export type RecipientPrefs = {
  email_opt_in: boolean
  whatsapp_opt_in: boolean
  sms_opt_in: boolean
  in_app_opt_in: boolean
}

/** Effective channel opt-ins for a recipient (scoped function; staff-only). */
export async function getRecipientPrefs(profileId: string): Promise<RecipientPrefs | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_recipient_preferences', { p_profile_id: profileId })
  if (error || !data || data.length === 0) return null
  return data[0] as RecipientPrefs
}

export type QueueResult = { ok: true; id: string } | { ok: false; error: string }

/**
 * Queue a composed message (status='pending'). RLS gates the insert to the caller's
 * scope; the consent trigger blocks email/whatsapp/sms to non-opted-in recipients
 * (in_app always allowed). Nothing is sent.
 */
export async function queueMessage(input: {
  templateId: string
  policyId: string
  variables: Record<string, string>
}): Promise<QueueResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { data: tpl } = await supabase
    .from('notification_templates')
    .select('channel, category, required_variables')
    .eq('id', input.templateId)
    .maybeSingle()
  if (!tpl) return { ok: false, error: 'Template not found.' }

  const missing = missingVariables((tpl.required_variables as string[]) ?? [], input.variables)
  if (missing.length) return { ok: false, error: `Missing required values: ${missing.join(', ')}.` }

  const { data: policy } = await supabase
    .from('policies')
    .select('id, customer_profile_id')
    .eq('id', input.policyId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!policy) return { ok: false, error: 'Policy not found or not in your scope.' }
  if (!policy.customer_profile_id) return { ok: false, error: 'This policy has no linked customer account.' }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: policy.customer_profile_id,
      policy_id: policy.id,
      type: 'custom', // stable required queue field; classification is `category`
      channel: tpl.channel,
      category: tpl.category ?? undefined, // DB default 'custom' when template has none
      template_ref_id: input.templateId,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      created_by: user.id,
      payload: input.variables,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    // The consent trigger raises a friendly message; surface it as-is.
    if (error.message.includes('opted in') || error.message.includes('consent')) {
      return { ok: false, error: error.message }
    }
    if (error.code === '42501' || error.message.includes('row-level security')) {
      return { ok: false, error: 'You are not permitted to message this record.' }
    }
    return { ok: false, error: error.message }
  }
  if (!data) return { ok: false, error: 'Could not queue the message.' }
  return { ok: true, id: data.id }
}

export type DeliveryLogRow = {
  status: string
  attempt: number
  detail: string | null
  created_at: string
}

export type MessageRow = {
  id: string
  channel: string
  category: string | null
  status: string
  created_at: string
  scheduled_at: string
  sent_at: string | null
  provider_message_id: string | null
  retry_count: number
  max_retries: number
  error_message: string | null
  policy: { policy_number: string } | null
  delivery_logs: DeliveryLogRow[]
}

/**
 * The communication queue log, RLS-scoped to what the caller can see. Surfaces
 * dispatch state (status / provider id / retries / last error) and the per-attempt
 * delivery_logs trail (M13) so staff can see exactly what the worker did.
 */
export async function listMessages(): Promise<MessageRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, channel, category, status, created_at, scheduled_at, sent_at, provider_message_id, retry_count, max_retries, error_message, policy:policies(policy_number), delivery_logs(status, attempt, detail, created_at)'
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  const rows = (data ?? []) as unknown as MessageRow[]
  // Order each row's attempts oldest→newest for a readable timeline.
  for (const r of rows) {
    r.delivery_logs = (r.delivery_logs ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return rows
}
