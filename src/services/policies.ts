import { createClient } from '@/lib/supabase/server'
import { staffNameMap } from './staff'
import type { PolicyStatus } from '@/types'

// Policy data access. Session/RLS client only — RLS scopes every read/write
// (RM sees assigned, managers see branch/team, super admin sees all). No
// admin/service-role client: staff inserts/updates are allowed by migration 020
// RLS, and DB triggers handle all auditing. RM display names come from the
// least-privilege v_staff_directory view (migration 019) via staffNameMap.

export type PolicyListRow = {
  id: string
  policy_number: string
  status: PolicyStatus
  holder_name: string
  premium_cents: number | null
  expiry_date: string | null
  renewal_date: string | null
  created_at: string
  insurer: { name: string } | null
  product: { name: string } | null
  branch: { name: string } | null
  assigned_rm: { id: string; profile: { full_name: string | null } | null } | null
}

const LIST_SELECT =
  'id, policy_number, status, holder_name, premium_cents, expiry_date, renewal_date, created_at,' +
  ' insurer:insurers(name),' +
  ' product:insurance_products(name),' +
  ' branch:branches(name),' +
  ' assigned_rm:relationship_managers(id)'

export type ExpiryFilter = 'this_month' | 'next_30' | 'expired'

export type PolicyListOpts = {
  search?: string
  status?: PolicyStatus
  insurerId?: string
  productId?: string
  expiry?: ExpiryFilter
  page?: number
  pageSize?: number
}

export type PolicyListResult = {
  rows: PolicyListRow[]
  total: number
  page: number
  pageSize: number
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function monthBoundsISO(): { start: string; end: string } {
  const d = new Date()
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

/** Attach assigned-RM display names from the staff directory view (in place). */
async function attachRmNames(rows: { assigned_rm: PolicyListRow['assigned_rm'] }[]): Promise<void> {
  const names = await staffNameMap(rows.map((r) => r.assigned_rm?.id))
  for (const r of rows) {
    if (r.assigned_rm) r.assigned_rm.profile = { full_name: names.get(r.assigned_rm.id) ?? null }
  }
}

/** Policies visible to the current user (RLS-scoped), with filters + pagination. */
export async function listPolicies(opts: PolicyListOpts = {}): Promise<PolicyListResult> {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  let query = supabase
    .from('policies')
    .select(LIST_SELECT, { count: 'exact' })
    .is('deleted_at', null)

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.insurerId) query = query.eq('insurer_id', opts.insurerId)
  if (opts.productId) query = query.eq('product_id', opts.productId)
  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/[%,]/g, '')
    query = query.or(`policy_number.ilike.%${term}%,holder_name.ilike.%${term}%`)
  }
  if (opts.expiry === 'expired') {
    query = query.lt('expiry_date', todayISO())
  } else if (opts.expiry === 'next_30') {
    query = query.gte('expiry_date', todayISO()).lte('expiry_date', addDaysISO(30))
  } else if (opts.expiry === 'this_month') {
    const { start, end } = monthBoundsISO()
    query = query.gte('expiry_date', start).lte('expiry_date', end)
  }

  query = query.order('created_at', { ascending: false }).range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as PolicyListRow[]
  await attachRmNames(rows)
  return { rows, total: count ?? 0, page, pageSize }
}

export type PolicyDetail = {
  id: string
  policy_number: string
  status: PolicyStatus
  holder_name: string
  holder_email: string | null
  holder_phone: string | null
  policy_type: string | null
  premium_cents: number | null
  sum_assured_cents: number | null
  issue_date: string | null
  start_date: string | null
  expiry_date: string | null
  renewal_date: string | null
  renewal_completed_at: string | null
  last_contacted_at: string | null
  notes: string | null
  created_at: string
  customer_profile_id: string | null
  lead_id: string | null
  appointment_id: string | null
  branch_id: string | null
  assigned_rm_id: string | null
  insurer: { id: string; name: string } | null
  product: { id: string; name: string } | null
  branch: { id: string; name: string } | null
  assigned_rm: {
    id: string
    team: { id: string; name: string } | null
    profile: { full_name: string | null } | null
  } | null
  lead: { id: string; first_name: string; last_name: string } | null
  appointment: { id: string; appointment_date: string; start_time: string } | null
}

const DETAIL_SELECT =
  'id, policy_number, status, holder_name, holder_email, holder_phone, policy_type,' +
  ' premium_cents, sum_assured_cents, issue_date, start_date, expiry_date,' +
  ' renewal_date, renewal_completed_at, last_contacted_at, notes, created_at, customer_profile_id, lead_id, appointment_id, branch_id,' +
  ' assigned_rm_id,' +
  ' insurer:insurers(id,name),' +
  ' product:insurance_products(id,name),' +
  ' branch:branches(id,name),' +
  ' assigned_rm:relationship_managers(id, team:teams!relationship_managers_team_id_fkey(id,name)),' +
  ' lead:leads(id, first_name, last_name),' +
  ' appointment:appointments(id, appointment_date, start_time)'

/** A single policy, or null if not found / outside the viewer's RLS scope. */
export async function getPolicy(id: string): Promise<PolicyDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('policies')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const policy = data as unknown as PolicyDetail
  if (policy.assigned_rm) {
    const names = await staffNameMap([policy.assigned_rm.id])
    policy.assigned_rm.profile = { full_name: names.get(policy.assigned_rm.id) ?? null }
  }
  return policy
}

export type PolicyActivity = {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

/** Activity timeline for a policy (RLS-scoped via migration 020). */
export async function getPolicyActivity(id: string): Promise<PolicyActivity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, metadata, created_at')
    .eq('entity_type', 'policy')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as PolicyActivity[]
}

export type PolicyInput = {
  policy_number: string
  product_id: string
  insurer_id: string
  holder_name: string
  holder_email?: string | null
  holder_phone?: string | null
  branch_id?: string | null
  assigned_rm_id?: string | null
  customer_profile_id?: string | null
  lead_id?: string | null
  appointment_id?: string | null
  policy_type?: string | null
  premium_cents?: number | null
  sum_assured_cents?: number | null
  status?: PolicyStatus
  issue_date?: string | null
  start_date?: string | null
  expiry_date?: string | null
  renewal_date?: string | null
  notes?: string | null
}

export type PolicyMutationResult = { ok: true; id: string } | { ok: false; error: string }

/** Create a policy. RLS gates the insert; the DB trigger logs policy.created. */
export async function createPolicy(input: PolicyInput): Promise<PolicyMutationResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('policies')
    .insert({
      policy_number: input.policy_number,
      product_id: input.product_id,
      insurer_id: input.insurer_id,
      holder_name: input.holder_name,
      holder_email: input.holder_email ?? null,
      holder_phone: input.holder_phone ?? null,
      branch_id: input.branch_id ?? null,
      assigned_rm_id: input.assigned_rm_id ?? null,
      customer_profile_id: input.customer_profile_id ?? null,
      lead_id: input.lead_id ?? null,
      appointment_id: input.appointment_id ?? null,
      policy_type: input.policy_type ?? null,
      premium_cents: input.premium_cents ?? null,
      sum_assured_cents: input.sum_assured_cents ?? null,
      status: input.status ?? 'draft',
      issue_date: input.issue_date ?? null,
      start_date: input.start_date ?? null,
      expiry_date: input.expiry_date ?? null,
      renewal_date: input.renewal_date ?? null,
      notes: input.notes ?? null,
    })
    .select('id')
    .maybeSingle()
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'That policy number already exists.' }
    return { ok: false, error: error.message }
  }
  if (!data) return { ok: false, error: 'Not permitted to create a policy in this scope.' }
  return { ok: true, id: data.id }
}

// Fields an editor may change (mirrors the M8 edit spec).
export type PolicyPatch = {
  premium_cents?: number | null
  sum_assured_cents?: number | null
  expiry_date?: string | null
  renewal_date?: string | null
  renewal_completed_at?: string | null
  last_contacted_at?: string | null
  status?: PolicyStatus
  assigned_rm_id?: string | null
}

/** Update editable fields. RLS gates the statement; triggers log status/assign/update. */
export async function updatePolicy(id: string, patch: PolicyPatch): Promise<PolicyMutationResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('policies')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Policy not found or you cannot edit it.' }
  return { ok: true, id: data.id }
}

/** Soft delete (never a hard delete). RLS gates it; the trigger logs policy.deleted. */
export async function softDeletePolicy(id: string): Promise<PolicyMutationResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('policies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Policy not found or you cannot delete it.' }
  return { ok: true, id: data.id }
}

export type PolicyDashboard = {
  active: number
  expiring: number
  renewalsDue: number
  renewalsCompleted: number
  recent: PolicyListRow[]
}

/**
 * Dashboard widget data — all RLS-scoped to the viewer. Lifecycle-focused (no
 * payment metrics):
 *   active            — policies currently in force
 *   expiring          — active policies whose cover expires in the next 30 days
 *   renewalsDue       — active policies due for renewal in the next 30 days, not yet actioned
 *   renewalsCompleted — renewals completed this month (renewal_completed_at)
 *   recent            — most recently added policies
 */
export async function getPolicyDashboard(): Promise<PolicyDashboard> {
  const supabase = await createClient()
  const { start, end } = monthBoundsISO()
  const today = todayISO()
  const in30 = addDaysISO(30)

  const [activeRes, expiringRes, dueRes, completedRes, recentRes] = await Promise.all([
    supabase
      .from('policies')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active'),
    supabase
      .from('policies')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active')
      .gte('expiry_date', today)
      .lte('expiry_date', in30),
    supabase
      .from('policies')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active')
      .is('renewal_completed_at', null)
      .gte('renewal_date', today)
      .lte('renewal_date', in30),
    supabase
      .from('policies')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('renewal_completed_at', start)
      .lte('renewal_completed_at', end),
    supabase
      .from('policies')
      .select(LIST_SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const recent = (recentRes.data ?? []) as unknown as PolicyListRow[]
  await attachRmNames(recent)

  return {
    active: activeRes.count ?? 0,
    expiring: expiringRes.count ?? 0,
    renewalsDue: dueRes.count ?? 0,
    renewalsCompleted: completedRes.count ?? 0,
    recent,
  }
}

/** RMs the current user may assign a policy to (scoped by the staff directory view). */
export async function listAssignableRms(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_staff_directory')
    .select('rm_id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
  if (error) return []
  return (data ?? []).map((r) => ({
    id: r.rm_id as string,
    name: (r.full_name as string | null) ?? 'Unnamed RM',
  }))
}

/** Current user's RM id (for defaulting policy assignment), or null. */
export async function currentRmId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_rm_id')
  if (error) return null
  return (data as string | null) ?? null
}
