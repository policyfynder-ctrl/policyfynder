'use server'

import { revalidatePath } from 'next/cache'
import { setRmActive, addRmSchedule, deleteRmSchedule } from '@/services/rms'

export type RmActionState = { error?: string; success?: string } | undefined

export async function toggleRmActiveAction(
  _prev: RmActionState,
  formData: FormData
): Promise<RmActionState> {
  const id = String(formData.get('rm_id') ?? '')
  const isActive = String(formData.get('is_active') ?? '') === 'true'
  if (!id) return { error: 'Missing RM id.' }
  const res = await setRmActive(id, isActive)
  if (!res.ok) return { error: res.error }
  revalidatePath(`/dashboard/rms/${id}`)
  revalidatePath('/dashboard/rms')
  return { success: isActive ? 'RM activated.' : 'RM deactivated.' }
}

export async function addScheduleAction(
  _prev: RmActionState,
  formData: FormData
): Promise<RmActionState> {
  const rmId = String(formData.get('rm_id') ?? '')
  const dow = Number(formData.get('day_of_week'))
  const start = String(formData.get('start_time') ?? '')
  const end = String(formData.get('end_time') ?? '')
  if (!rmId || Number.isNaN(dow) || !start || !end) return { error: 'All fields are required.' }
  const res = await addRmSchedule(rmId, dow, start, end)
  if (!res.ok) return { error: res.error }
  revalidatePath(`/dashboard/rms/${rmId}`)
  return { success: 'Schedule added.' }
}

// Void variant for per-row delete buttons (plain <form action>).
export async function deleteScheduleForm(formData: FormData): Promise<void> {
  const scheduleId = String(formData.get('schedule_id') ?? '')
  const rmId = String(formData.get('rm_id') ?? '')
  if (!scheduleId) return
  await deleteRmSchedule(scheduleId)
  revalidatePath(`/dashboard/rms/${rmId}`)
}
