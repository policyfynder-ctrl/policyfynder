import { createClient } from '@/lib/supabase/server'

// Communication preferences (migration 026). Self-service via RLS (comm_prefs_self).

export type Preferences = {
  email_opt_in: boolean
  whatsapp_opt_in: boolean
  sms_opt_in: boolean
  in_app_opt_in: boolean
  preferred_channel: 'email' | 'whatsapp' | 'sms' | 'in_app'
}

const DEFAULTS: Preferences = {
  email_opt_in: true,
  whatsapp_opt_in: false,
  sms_opt_in: false,
  in_app_opt_in: true,
  preferred_channel: 'email',
}

export async function getMyPreferences(): Promise<Preferences> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULTS
  const { data } = await supabase
    .from('communication_preferences')
    .select('email_opt_in, whatsapp_opt_in, sms_opt_in, in_app_opt_in, preferred_channel')
    .eq('profile_id', user.id)
    .maybeSingle()
  return (data as Preferences) ?? DEFAULTS
}

export type PrefsResult = { ok: true } | { ok: false; error: string }

export async function updateMyPreferences(prefs: Preferences): Promise<PrefsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const { error } = await supabase
    .from('communication_preferences')
    .upsert({ profile_id: user.id, ...prefs }, { onConflict: 'profile_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
