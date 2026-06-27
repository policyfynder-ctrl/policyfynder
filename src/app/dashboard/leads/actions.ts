'use server'

import { revalidatePath } from 'next/cache'
import { updateLeadStatus } from '@/services/leads'
import { isLeadStatus } from '@/lib/leads'

export type StatusActionState = { error?: string; success?: string } | undefined

// Server action for the lead status control. RLS enforces whether the caller may
// update this lead; we never use the admin client here.
export async function updateLeadStatusAction(
  _prev: StatusActionState,
  formData: FormData
): Promise<StatusActionState> {
  const id = String(formData.get('lead_id') ?? '')
  const status = String(formData.get('status') ?? '')

  if (!id) return { error: 'Missing lead id.' }
  if (!isLeadStatus(status)) return { error: 'Invalid status.' }

  const result = await updateLeadStatus(id, status)
  if (!result.ok) return { error: result.error }

  revalidatePath(`/dashboard/leads/${id}`)
  revalidatePath('/dashboard/leads')
  return { success: 'Status updated.' }
}
