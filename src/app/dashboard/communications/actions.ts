'use server'

import { revalidatePath } from 'next/cache'
import { queueMessage } from '@/services/communications'

export type ComposeState = { error?: string; success?: string } | undefined

// Queue a composed message (status='pending'). RLS + the consent trigger enforce
// scope and opt-in on the server; nothing is sent.
export async function queueMessageAction(_prev: ComposeState, fd: FormData): Promise<ComposeState> {
  const templateId = String(fd.get('template_id') ?? '')
  const policyId = String(fd.get('policy_id') ?? '')
  if (!templateId) return { error: 'Choose a template.' }
  if (!policyId) return { error: 'Choose a recipient policy.' }

  // Variable inputs are named var_<key>.
  const variables: Record<string, string> = {}
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('var_')) variables[k.slice(4)] = String(v)
  }

  const res = await queueMessage({ templateId, policyId, variables })
  if (!res.ok) return { error: res.error }
  revalidatePath('/dashboard/communications')
  return { success: 'Message queued.' }
}
