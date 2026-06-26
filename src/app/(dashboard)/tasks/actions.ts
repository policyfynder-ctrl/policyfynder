'use server'

import { revalidatePath } from 'next/cache'
import { completeTask } from '@/services/tasks'

// Mark a task complete. RLS gates the update; the DB trigger logs task.completed.
export async function completeTaskAction(fd: FormData): Promise<void> {
  const id = String(fd.get('task_id') ?? '')
  if (!id) return
  await completeTask(id)
  revalidatePath('/dashboard/tasks')
}
