import { createClient } from '@/lib/supabase/server'
import type { PolicyStatus, AppointmentStatus } from '@/types'

// Customer-portal data access. Session/RLS client ONLY — every read is scoped by
// the existing customer RLS (policies.customer_profile_id = auth.uid(), appointments
// via lead, notifications recipient/own-policy). No admin client, no scope bypass.

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
function addDaysISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export type MyPolicyRow = {
  id: string
  policy_number: string
  status: PolicyStatus
  premium_cents: number | null
  renewal_date: string | null
  expiry_date: string | null
  insurer: { name: string } | null
  product: { name: string } | null
}

const MY_POLICY_SELECT =
  'id, policy_number, status, premium_cents, renewal_date, expiry_date,' +
  ' insurer:insurers(name), product:insurance_products(name)'

export async function listMyPolicies(opts?: {
  search?: string
  status?: PolicyStatus
}): Promise<MyPolicyRow[]> {
  const supabase = await createClient()
  let q = supabase.from('policies').select(MY_POLICY_SELECT).is('deleted_at', null)
  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.search?.trim()) {
    const t = opts.search.trim().replace(/[%,]/g, '')
    q = q.ilike('policy_number', `%${t}%`)
  }
  q = q.order('created_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as MyPolicyRow[]
}

export type MyPolicyDetail = {
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
  insurer: { name: string } | null
  product: { name: string } | null
}

export async function getMyPolicy(id: string): Promise<MyPolicyDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('policies')
    .select(
      'id, policy_number, status, holder_name, holder_email, holder_phone, policy_type,' +
        ' premium_cents, sum_assured_cents, issue_date, start_date, expiry_date, renewal_date,' +
        ' renewal_completed_at, insurer:insurers(name), product:insurance_products(name)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as MyPolicyDetail) ?? null
}

export type PolicyActivity = { id: string; action: string; created_at: string }

/** Activity history for one of the customer's policies (RLS-scoped). */
export async function getMyPolicyHistory(id: string): Promise<PolicyActivity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, created_at')
    .eq('entity_type', 'policy')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as PolicyActivity[]
}

export type MyRenewalRow = {
  id: string
  policy_number: string
  status: PolicyStatus
  renewal_date: string | null
  renewal_completed_at: string | null
  insurer: { name: string } | null
}

/** All of the customer's policies that carry renewal info, newest renewal first. */
export async function listMyRenewals(): Promise<MyRenewalRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('policies')
    .select('id, policy_number, status, renewal_date, renewal_completed_at, insurer:insurers(name)')
    .is('deleted_at', null)
    .or('renewal_date.not.is.null,renewal_completed_at.not.is.null')
    .order('renewal_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as MyRenewalRow[]
}

export type MyAppointmentRow = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  branch: { name: string } | null
}

export async function listMyAppointments(): Promise<MyAppointmentRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, start_time, end_time, status, branch:branches(name)')
    .is('deleted_at', null)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as MyAppointmentRow[]
}

export type MyNotification = {
  id: string
  type: string
  status: string
  created_at: string
  scheduled_at: string
  payload: Record<string, unknown> | null
}

export async function listMyNotifications(): Promise<MyNotification[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, status, created_at, scheduled_at, payload')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []) as MyNotification[]
}

export type MyRm = { rm_name: string | null; email: string | null; phone: string | null }

/** The customer's assigned RM contact (scoped function — only their own RM). */
export async function getMyRm(): Promise<MyRm | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_customer_rm')
  if (error || !data || data.length === 0) return null
  return data[0] as MyRm
}

export type CustomerProfile = { id: string; full_name: string | null; email: string | null; phone: string | null }

export async function getMyProfile(): Promise<CustomerProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle()
  return (data as CustomerProfile) ?? null
}

export type ProfileResult = { ok: true } | { ok: false; error: string }

/** Update the customer's own name/phone. The profiles trigger blocks role/email changes. */
export async function updateMyProfile(fullName: string, phone: string): Promise<ProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export type CustomerDashboard = {
  activePolicies: number
  upcomingRenewals: MyRenewalRow[]
  recentNotifications: MyNotification[]
  upcomingAppointments: MyAppointmentRow[]
  rm: MyRm | null
}

export async function getCustomerDashboard(): Promise<CustomerDashboard> {
  const supabase = await createClient()
  const today = todayISO()
  const in90 = addDaysISO(90)

  const [activeRes, renewalsRes, notifsRes, apptsRes, rm] = await Promise.all([
    supabase.from('policies').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
    supabase
      .from('policies')
      .select('id, policy_number, status, renewal_date, renewal_completed_at, insurer:insurers(name)')
      .is('deleted_at', null)
      .eq('status', 'active')
      .is('renewal_completed_at', null)
      .gte('renewal_date', today)
      .lte('renewal_date', in90)
      .order('renewal_date', { ascending: true }),
    listMyNotifications(),
    supabase
      .from('appointments')
      .select('id, appointment_date, start_time, end_time, status, branch:branches(name)')
      .is('deleted_at', null)
      .gte('appointment_date', today)
      .not('status', 'in', '(cancelled,no_show)')
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true }),
    getMyRm(),
  ])

  return {
    activePolicies: activeRes.count ?? 0,
    upcomingRenewals: (renewalsRes.data ?? []) as unknown as MyRenewalRow[],
    recentNotifications: (notifsRes ?? []).slice(0, 5),
    upcomingAppointments: (apptsRes.data ?? []) as unknown as MyAppointmentRow[],
    rm,
  }
}
