'use server'

import { revalidatePath } from 'next/cache'
import { updateMyProfile } from '@/services/portal'

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
