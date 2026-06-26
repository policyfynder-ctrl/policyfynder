import { createClient } from '@/lib/supabase/server'
import { staffNameMap } from './staff'

// RM data access. Session/RLS client only. Reads are scoped by RLS (branch/team);
// writes (activate, schedules) are allowed by migration 018 for managers of the
// RM's branch. Creating/promoting RMs goes through /api/admin/rms (service role).
//
// RM display names come from v_staff_directory (migration 019), NOT a profiles
// embed: profiles is self+admin only, and exposing email/phone to managers would
// violate least-privilege. The view returns name only, scoped to accessible RMs.

export type RmRow = {
  id: string
  is_active: boolean
  max_daily_appointments: number
  employee_id: string | null
  branch: { id: string; name: string } | null
  team: { id: string; name: string } | null
  profile: { full_name: string | null } | null
}

const RM_SELECT =
  'id, is_active, max_daily_appointments, employee_id,' +
  ' branch:branches(id,name),' +
  // RM↔teams has two FKs (team_id and team_leader_rm_id); disambiguate to team_id.
  ' team:teams!relationship_managers_team_id_fkey(id,name)'

export async function listRms(): Promise<RmRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('relationship_managers')
    .select(RM_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as unknown as RmRow[]
  const names = await staffNameMap(rows.map((r) => r.id))
  for (const r of rows) r.profile = { full_name: names.get(r.id) ?? null }
  return rows
}

export type RmSchedule = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

export type RmDetail = RmRow & { schedules: RmSchedule[] }

export async function getRm(id: string): Promise<RmDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('relationship_managers')
    .select(RM_SELECT + ', schedules:rm_schedules(id,day_of_week,start_time,end_time,is_active)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const rm = data as unknown as RmDetail
  const names = await staffNameMap([rm.id])
  rm.profile = { full_name: names.get(rm.id) ?? null }
  rm.schedules = [...(rm.schedules ?? [])].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  )
  return rm
}

export type RmActionResult = { ok: true } | { ok: false; error: string }

export async function setRmActive(id: string, isActive: boolean): Promise<RmActionResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('relationship_managers')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Not permitted or RM not found.' }
  return { ok: true }
}

export async function addRmSchedule(
  rmId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<RmActionResult> {
  if (endTime <= startTime) return { ok: false, error: 'End time must be after start time.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rm_schedules')
    .insert({ rm_id: rmId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime })
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Not permitted.' }
  return { ok: true }
}

export async function deleteRmSchedule(scheduleId: string): Promise<RmActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('rm_schedules').delete().eq('id', scheduleId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
