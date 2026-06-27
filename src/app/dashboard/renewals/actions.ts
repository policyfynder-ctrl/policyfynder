'use server'

import { revalidatePath } from 'next/cache'
import { updatePolicy } from '@/services/policies'
import { createTask } from '@/services/tasks'

// Renewal pipeline row actions. RLS gates every write (updatePolicy / createTask);
// DB triggers handle auditing. Queue-only — no external messages are sent.

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function logContactAction(fd: FormData): Promise<void> {
  const id = String(fd.get('policy_id') ?? '')
  if (!id) return
  await updatePolicy(id, { last_contacted_at: today() })
  revalidatePath('/dashboard/renewals')
}

export async function markRenewedAction(fd: FormData): Promise<void> {
  const id = String(fd.get('policy_id') ?? '')
  if (!id) return
  await updatePolicy(id, { renewal_completed_at: today() })
  revalidatePath('/dashboard/renewals')
}

export async function createRenewalTaskAction(fd: FormData): Promise<void> {
  const id = String(fd.get('policy_id') ?? '')
  if (!id) return
  const rm = String(fd.get('assigned_rm_id') ?? '')
  const number = String(fd.get('policy_number') ?? '')
  const due = String(fd.get('renewal_date') ?? '')
  await createTask({
    entity_type: 'policy',
    entity_id: id,
    assigned_rm_id: rm || null,
    kind: 'renewal',
    title: 'Policy renewal due',
    note: number ? `Renewal for policy ${number}` : null,
    due_at: due ? new Date(due).toISOString() : null,
  })
  revalidatePath('/dashboard/renewals')
  revalidatePath('/dashboard/tasks')
}
