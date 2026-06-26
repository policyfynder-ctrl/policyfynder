import { createClient } from '@/lib/supabase/server'
import { staffNameMap } from './staff'

// Team data access. Session/RLS client only. Reads scoped by RLS; writes allowed by
// migration 018 (manage_branch / manage_own).
//
// RM display names (team leader + members) come from v_staff_directory (migration
// 019), not a profiles embed — profiles is self+admin only and we must not expose
// RM email/phone to managers.

export type TeamRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  branch: { id: string; name: string } | null
  leader: { id: string; profile: { full_name: string | null } | null } | null
  member_count: { count: number }[]
}

const TEAM_SELECT =
  'id, name, description, is_active,' +
  ' branch:branches(id,name),' +
  ' leader:relationship_managers!teams_team_leader_rm_id_fkey(id),' +
  ' member_count:team_members(count)'

export async function listTeams(): Promise<TeamRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select(TEAM_SELECT)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as unknown as TeamRow[]
  const names = await staffNameMap(rows.map((t) => t.leader?.id))
  for (const t of rows) {
    if (t.leader) t.leader.profile = { full_name: names.get(t.leader.id) ?? null }
  }
  return rows
}

export type TeamMember = {
  id: string
  rm_id: string
  is_current: boolean
  rm: { id: string; profile: { full_name: string | null } | null } | null
}

export type TeamDetail = Omit<TeamRow, 'member_count'> & { members: TeamMember[] }

export async function getTeam(id: string): Promise<TeamDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select(
      'id, name, description, is_active,' +
        ' branch:branches(id,name),' +
        ' leader:relationship_managers!teams_team_leader_rm_id_fkey(id),' +
        ' members:team_members(id, rm_id, is_current, rm:relationship_managers(id))'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const team = data as unknown as TeamDetail
  team.members = (team.members ?? []).filter((m) => m.is_current)

  // Resolve leader + member names from the staff directory view.
  const names = await staffNameMap([team.leader?.id, ...team.members.map((m) => m.rm?.id)])
  if (team.leader) team.leader.profile = { full_name: names.get(team.leader.id) ?? null }
  for (const m of team.members) {
    if (m.rm) m.rm.profile = { full_name: names.get(m.rm.id) ?? null }
  }
  return team
}

export type TeamActionResult = { ok: true; id?: string } | { ok: false; error: string }

export async function createTeam(
  branchId: string,
  name: string,
  description?: string
): Promise<TeamActionResult> {
  if (!name.trim()) return { ok: false, error: 'Team name is required.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .insert({ branch_id: branchId, name: name.trim(), description: description?.trim() || null })
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Not permitted to create a team in this branch.' }
  return { ok: true, id: data.id }
}

export async function addTeamMember(teamId: string, rmId: string): Promise<TeamActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, rm_id: rmId })
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Not permitted.' }
  return { ok: true, id: data.id }
}

export async function removeTeamMember(memberId: string): Promise<TeamActionResult> {
  const supabase = await createClient()
  // History-preserving: mark left rather than delete.
  const { error } = await supabase
    .from('team_members')
    .update({ is_current: false, left_at: new Date().toISOString() })
    .eq('id', memberId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** RMs available to add to a team (same branch, scoped by the staff directory view). */
export async function listAssignableRms(branchId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_staff_directory')
    .select('rm_id, full_name')
    .eq('branch_id', branchId)
    .eq('is_active', true)
  if (error) return []
  return (data ?? []).map((r) => ({
    id: r.rm_id as string,
    name: (r.full_name as string | null) ?? 'Unnamed RM',
  }))
}
