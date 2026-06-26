import { createClient } from '@/lib/supabase/server'
import { staffNameMap } from './staff'

// Generic RM task/follow-up data access (migration 023). Session/RLS client only —
// RLS scopes by assigned RM + manager hierarchy. Renewal tasks are created by the
// generate_renewal_reminders() function (admin API) and surfaced here.

export type TaskEntity = 'lead' | 'policy' | 'appointment' | 'general'

export type TaskRow = {
  id: string
  entity_type: TaskEntity
  entity_id: string | null
  kind: string
  title: string
  note: string | null
  due_at: string | null
  completed_at: string | null
  created_at: string
  assigned_rm_id: string | null
  assigned_rm: { full_name: string | null } | null
  entity_label: string | null // e.g. the policy number, for policy tasks
}

const SELECT =
  'id, entity_type, entity_id, kind, title, note, due_at, completed_at, created_at, assigned_rm_id'

export async function listTasks(opts?: {
  status?: 'open' | 'completed'
  kind?: string
}): Promise<TaskRow[]> {
  const supabase = await createClient()
  let q = supabase.from('tasks').select(SELECT).is('deleted_at', null)
  if (opts?.status === 'open') q = q.is('completed_at', null)
  else if (opts?.status === 'completed') q = q.not('completed_at', 'is', null)
  if (opts?.kind) q = q.eq('kind', opts.kind)
  q = q.order('due_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) throw error
  const rows = (data ?? []) as unknown as TaskRow[]

  // RM display names via the M7 staff-directory view.
  const names = await staffNameMap(rows.map((r) => r.assigned_rm_id))
  for (const r of rows) {
    r.assigned_rm = r.assigned_rm_id ? { full_name: names.get(r.assigned_rm_id) ?? null } : null
    r.entity_label = null
  }

  // Resolve policy numbers for policy-linked tasks (RLS-scoped).
  const policyIds = [
    ...new Set(rows.filter((r) => r.entity_type === 'policy' && r.entity_id).map((r) => r.entity_id as string)),
  ]
  if (policyIds.length) {
    const { data: pols } = await supabase.from('policies').select('id, policy_number').in('id', policyIds)
    const pmap = new Map((pols ?? []).map((p) => [p.id as string, p.policy_number as string]))
    for (const r of rows) {
      if (r.entity_type === 'policy' && r.entity_id) r.entity_label = pmap.get(r.entity_id) ?? null
    }
  }
  return rows
}

export type TaskResult = { ok: true; id: string } | { ok: false; error: string }

export async function createTask(input: {
  entity_type: TaskEntity
  entity_id?: string | null
  assigned_rm_id?: string | null
  title: string
  note?: string | null
  kind?: string
  due_at?: string | null
}): Promise<TaskResult> {
  if (!input.title?.trim()) return { ok: false, error: 'Title is required.' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      assigned_rm_id: input.assigned_rm_id ?? null,
      created_by: user?.id ?? null,
      title: input.title.trim(),
      note: input.note ?? null,
      kind: input.kind ?? 'follow_up',
      due_at: input.due_at ?? null,
    })
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Not permitted to create this task in your scope.' }
  return { ok: true, id: data.id }
}

/** Mark a task complete (idempotent on already-complete). The DB trigger logs task.completed. */
export async function completeTask(id: string): Promise<TaskResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .is('completed_at', null)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Task not found, already complete, or not permitted.' }
  return { ok: true, id: data.id }
}
