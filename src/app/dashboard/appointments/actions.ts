'use server'

import { revalidatePath } from 'next/cache'
import { updateAppointmentStatus, rescheduleAppointment } from '@/services/appointments'
import { resolveChangeRequest } from '@/services/changeRequests'
import { isAppointmentStatus } from '@/lib/appointments'

export type ApptActionState = { error?: string; success?: string } | undefined

// All actions rely on RLS for authorization — no admin client.

function revalidate(id: string) {
  revalidatePath(`/dashboard/appointments/${id}`)
  revalidatePath('/dashboard/appointments')
  revalidatePath('/dashboard')
}

export async function updateAppointmentStatusAction(
  _prev: ApptActionState,
  formData: FormData
): Promise<ApptActionState> {
  const id = String(formData.get('appointment_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id) return { error: 'Missing appointment id.' }
  if (!isAppointmentStatus(status)) return { error: 'Invalid status.' }

  const result = await updateAppointmentStatus(id, status)
  if (!result.ok) return { error: result.error }
  revalidate(id)
  return { success: 'Status updated.' }
}

export async function cancelAppointmentAction(
  _prev: ApptActionState,
  formData: FormData
): Promise<ApptActionState> {
  const id = String(formData.get('appointment_id') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()
  if (!id) return { error: 'Missing appointment id.' }

  const result = await updateAppointmentStatus(id, 'cancelled', reason || undefined)
  if (!result.ok) return { error: result.error }
  revalidate(id)
  return { success: 'Appointment cancelled.' }
}

export async function rescheduleAppointmentAction(
  _prev: ApptActionState,
  formData: FormData
): Promise<ApptActionState> {
  const id = String(formData.get('appointment_id') ?? '')
  const slotDate = String(formData.get('slot_date') ?? '')
  const slotStart = String(formData.get('slot_start') ?? '')
  const slotEnd = String(formData.get('slot_end') ?? '')
  if (!id) return { error: 'Missing appointment id.' }
  if (!slotDate || !slotStart || !slotEnd) return { error: 'Please choose a new slot.' }

  const result = await rescheduleAppointment(id, slotDate, slotStart, slotEnd)
  if (!result.ok) return { error: result.error }
  revalidate(id)
  return { success: 'Appointment rescheduled.' }
}

// RM/manager resolves a customer change request. Approving a cancel also cancels
// the appointment; RLS gates whether the caller may resolve it.
export async function resolveRequestAction(fd: FormData): Promise<void> {
  const requestId = String(fd.get('request_id') ?? '')
  const apptId = String(fd.get('appointment_id') ?? '')
  const decision = String(fd.get('decision') ?? '')
  if (!requestId || (decision !== 'approved' && decision !== 'declined')) return
  await resolveChangeRequest(requestId, decision)
  if (apptId) revalidate(apptId)
}
