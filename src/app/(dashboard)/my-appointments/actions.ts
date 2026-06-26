'use server'

import { revalidatePath } from 'next/cache'
import { createChangeRequest } from '@/services/changeRequests'

export type RequestActionState = { error?: string; success?: string } | undefined

// Customer files a cancel/reschedule request. RLS enforces appointment ownership;
// an RM approves it (the appointment itself isn't mutated by the customer).
export async function requestChangeAction(
  _prev: RequestActionState,
  fd: FormData
): Promise<RequestActionState> {
  const appointmentId = String(fd.get('appointment_id') ?? '')
  const type = String(fd.get('type') ?? '')
  if (!appointmentId) return { error: 'Missing appointment.' }
  if (type !== 'cancel' && type !== 'reschedule') return { error: 'Invalid request type.' }

  const res = await createChangeRequest({
    appointmentId,
    type,
    preferredDate: String(fd.get('preferred_date') ?? '') || null,
    preferredTime: String(fd.get('preferred_time') ?? '') || null,
    reason: String(fd.get('reason') ?? '') || null,
  })
  if (!res.ok) return { error: res.error }
  revalidatePath('/dashboard/my-appointments')
  return {
    success: type === 'cancel' ? 'Cancellation request sent to your RM.' : 'Reschedule request sent to your RM.',
  }
}
