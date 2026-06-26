'use server'

import { revalidatePath } from 'next/cache'
import { createTeam, addTeamMember, removeTeamMember } from '@/services/teams'

export type TeamActionState = { error?: string; success?: string } | undefined

export async function createTeamAction(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const branchId = String(formData.get('branch_id') ?? '')
  const name = String(formData.get('name') ?? '')
  const description = String(formData.get('description') ?? '')
  if (!branchId) return { error: 'Branch is required.' }
  const res = await createTeam(branchId, name, description)
  if (!res.ok) return { error: res.error }
  revalidatePath('/dashboard/teams')
  return { success: 'Team created.' }
}

export async function addMemberAction(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const teamId = String(formData.get('team_id') ?? '')
  const rmId = String(formData.get('rm_id') ?? '')
  if (!teamId || !rmId) return { error: 'Select an RM to add.' }
  const res = await addTeamMember(teamId, rmId)
  if (!res.ok) return { error: res.error }
  revalidatePath(`/dashboard/teams/${teamId}`)
  return { success: 'Member added.' }
}

// Void variant for per-row remove buttons (plain <form action>).
export async function removeMemberForm(formData: FormData): Promise<void> {
  const memberId = String(formData.get('member_id') ?? '')
  const teamId = String(formData.get('team_id') ?? '')
  if (!memberId) return
  await removeTeamMember(memberId)
  revalidatePath(`/dashboard/teams/${teamId}`)
}
