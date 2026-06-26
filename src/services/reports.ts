import { createClient } from '@/lib/supabase/server'

// Reports data access. Every report is a SECURITY DEFINER function (migration 024)
// that re-applies the caller's scope via get_accessible_* — so these wrappers need
// no extra scoping; the DB returns only what the viewer may see.

export type Overview = {
  leads_total: number
  leads_converted: number
  conversion_pct: number
  won_value_cents: number
  appts_total: number
  appts_completed: number
  no_show_pct: number
  active_policies: number
  premium_under_mgmt_cents: number
  renewals_due_30: number
  renewals_completed_mtd: number
}

export type RenewalsReport = {
  due_30: number
  due_60: number
  due_90: number
  overdue: number
  completed_mtd: number
  renewal_rate: number
}

export type CountRow = { label: string; count: number }
export type SourceRow = { source: string; total: number; converted: number }
export type MonthlyRow = { month: string; total: number; converted: number }
export type BreakdownRow = { name: string; count: number; premium_cents: number }

export type RmPerf = {
  rm_id: string
  rm_name: string | null
  leads_total: number
  leads_converted: number
  appts_completed: number
  active_policies: number
  renewals_completed_mtd: number
  tasks_open: number
  tasks_overdue: number
}
export type TeamPerf = {
  team_id: string
  team_name: string
  branch_name: string
  member_count: number
  leads_total: number
  leads_converted: number
  appts_completed: number
  active_policies: number
  renewals_completed_mtd: number
  tasks_open: number
}
export type BranchPerf = {
  branch_id: string
  branch_name: string
  rm_count: number
  leads_total: number
  leads_converted: number
  appts_completed: number
  active_policies: number
  renewals_completed_mtd: number
  premium_cents: number
}

export async function getOverview(): Promise<Overview | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_overview')
  if (error) return null
  return data as unknown as Overview
}

export async function getRenewalsReport(): Promise<RenewalsReport | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_renewals')
  if (error) return null
  return data as unknown as RenewalsReport
}

export async function getLeadFunnel(from: string, to: string): Promise<CountRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_lead_funnel', { p_from: from, p_to: to })
  if (error) return []
  return (data ?? []).map((r) => ({ label: r.status as string, count: Number(r.count) }))
}

export async function getLeadSources(from: string, to: string): Promise<SourceRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_lead_sources', { p_from: from, p_to: to })
  if (error) return []
  return (data ?? []).map((r) => ({
    source: r.source as string,
    total: Number(r.total),
    converted: Number(r.converted),
  }))
}

export async function getLeadsMonthly(months = 6): Promise<MonthlyRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_leads_monthly', { p_months: months })
  if (error) return []
  return (data ?? []).map((r) => ({
    month: r.month as string,
    total: Number(r.total),
    converted: Number(r.converted),
  }))
}

export async function getAppointmentStats(from: string, to: string): Promise<CountRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_appointment_stats', { p_from: from, p_to: to })
  if (error) return []
  return (data ?? []).map((r) => ({ label: r.status as string, count: Number(r.count) }))
}

export async function getPolicyStatus(): Promise<CountRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_policy_status')
  if (error) return []
  return (data ?? []).map((r) => ({ label: r.status as string, count: Number(r.count) }))
}

export async function getPolicyByInsurer(): Promise<BreakdownRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_policy_by_insurer')
  if (error) return []
  return (data ?? []) as unknown as BreakdownRow[]
}

export async function getPolicyByProduct(): Promise<BreakdownRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_policy_by_product')
  if (error) return []
  return (data ?? []) as unknown as BreakdownRow[]
}

export async function getRmPerformance(): Promise<RmPerf[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_rm_performance')
  if (error) return []
  return (data ?? []) as unknown as RmPerf[]
}

export async function getTeamPerformance(): Promise<TeamPerf[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_team_performance')
  if (error) return []
  return (data ?? []) as unknown as TeamPerf[]
}

export async function getBranchPerformance(): Promise<BranchPerf[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('report_branch_performance')
  if (error) return []
  return (data ?? []) as unknown as BranchPerf[]
}
