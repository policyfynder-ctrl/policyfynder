'use server'

import { revalidatePath } from 'next/cache'
import { updateMyProfile } from '@/services/portal'
import { getMyPreferences, updateMyPreferences } from '@/services/preferences'
import { recordConsent } from '@/services/consent'

export type ProfileActionState = { error?: string; success?: string } | undefined

export async function updateProfileAction(
  _prev: ProfileActionState,
  fd: FormData
): Promise<ProfileActionState> {
  const fullName = String(fd.get('full_name') ?? '')
  const phone = String(fd.get('phone') ?? '')
  const res = await updateMyProfile(fullName, phone)
  if (!res.ok) return { error: res.error }
  revalidatePath('/dashboard/profile')
  return { success: 'Profile updated.' }
}

// Grant/revoke consent for a channel — writes the consent ledger + opt-in flag.
export async function consentToggleAction(fd: FormData): Promise<void> {
  const channel = String(fd.get('channel') ?? '')
  const action = String(fd.get('action') ?? '')
  if (!['email', 'whatsapp', 'sms'].includes(channel)) return
  if (action !== 'granted' && action !== 'revoked') return
  await recordConsent(channel as 'email' | 'whatsapp' | 'sms', action)
  revalidatePath('/dashboard/profile')
}

// Update preferred channel + in-app toggle (preserves consent-driven opt-ins).
export async function updatePreferencesAction(fd: FormData): Promise<void> {
  const current = await getMyPreferences()
  const preferred = String(fd.get('preferred_channel') ?? current.preferred_channel)
  await updateMyPreferences({
    ...current,
    preferred_channel: (['email', 'whatsapp', 'sms', 'in_app'].includes(preferred)
      ? preferred
      : current.preferred_channel) as 'email' | 'whatsapp' | 'sms' | 'in_app',
    in_app_opt_in: fd.get('in_app_opt_in') != null,
  })
  revalidatePath('/dashboard/profile')
}
