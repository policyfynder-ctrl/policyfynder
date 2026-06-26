import { createClient } from '@/lib/supabase/server'

// Consent ledger (migration 026). Append-only consent_records + the matching opt-in
// flag on communication_preferences. Recording consent does both: writes an immutable
// ledger entry and updates the effective preference.

export type ConsentChannel = 'email' | 'whatsapp' | 'sms'
export type ConsentEntry = { id: string; channel: string; action: string; created_at: string }

export type ConsentResult = { ok: true } | { ok: false; error: string }

/** Customer grants or revokes consent for a channel (portal). RLS = self only. */
export async function recordConsent(
  channel: ConsentChannel,
  action: 'granted' | 'revoked'
): Promise<ConsentResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { error: ledgerErr } = await supabase
    .from('consent_records')
    .insert({ profile_id: user.id, channel, action, source: 'portal' })
  if (ledgerErr) return { ok: false, error: ledgerErr.message }

  const optIn = action === 'granted'
  const update: {
    profile_id: string
    email_opt_in?: boolean
    whatsapp_opt_in?: boolean
    sms_opt_in?: boolean
  } = { profile_id: user.id }
  if (channel === 'email') update.email_opt_in = optIn
  else if (channel === 'whatsapp') update.whatsapp_opt_in = optIn
  else update.sms_opt_in = optIn

  const { error: prefErr } = await supabase
    .from('communication_preferences')
    .upsert(update, { onConflict: 'profile_id' })
  if (prefErr) return { ok: false, error: prefErr.message }
  return { ok: true }
}

export async function listMyConsent(): Promise<ConsentEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consent_records')
    .select('id, channel, action, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []) as ConsentEntry[]
}
