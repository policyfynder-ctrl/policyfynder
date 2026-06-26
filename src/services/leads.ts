import { createClient } from '@/lib/supabase/server'
import type { LeadStatus } from '@/types'
import { staffNameMap } from './staff'

// Lead data access. Uses the standard server (session) client throughout, so RLS
// scopes every read/write to the caller's role automatically — RM sees assigned,
// managers see their branch/team, super admin sees all. No admin/service-role
// client here: there are NO RLS bypasses in lead management.

// Shape returned by listLeads — embedded relations are flattened to what the UI needs.
export type LeadListRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: LeadStatus
  priority: number
  created_at: string
  insurance_interest: string[]
  source: { name: string } | null
  assigned_rm: { id: string; profile: { full_name: string | null } | null } | null
  branch: { name: string } | null
}

// assigned-RM NAME comes from v_staff_directory (migration 019), resolved after
// the query — not via a profiles embed, which is self+admin only.
const LIST_SELECT =
  'id, first_name, last_name, email, phone, status, priority, created_at, insurance_interest,' +
  ' source:lead_sources(name),' +
  ' assigned_rm:relationship_managers(id),' +
  ' branch:branches(name)'

/** Attach assigned-RM display names from the staff directory view (in place). */
async function attachRmNames(rows: { assigned_rm: LeadListRow['assigned_rm'] }[]): Promise<void> {
  const names = await staffNameMap(rows.map((r) => r.assigned_rm?.id))
  for (const r of rows) {
    if (r.assigned_rm) r.assigned_rm.profile = { full_name: names.get(r.assigned_rm.id) ?? null }
  }
}

/** Leads visible to the current user (RLS-scoped). Optional status filter. */
export async function listLeads(opts?: { status?: LeadStatus }): Promise<LeadListRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('leads')
    .select(LIST_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (opts?.status) query = query.eq('status', opts.status)

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as LeadListRow[]
  await attachRmNames(rows)
  return rows
}

export type LeadDetail = LeadListRow & {
  source_campaign: string | null
  appointments: {
    id: string
    appointment_date: string
    start_time: string
    end_time: string
    status: string
    confirmation_token: string | null
  }[]
}

const DETAIL_SELECT =
  LIST_SELECT +
  ', source_campaign,' +
  ' appointments(id, appointment_date, start_time, end_time, status, confirmation_token)'

/** A single lead with appointment history, or null if not found / not permitted (RLS). */
export async function getLead(id: string): Promise<LeadDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const lead = data as unknown as LeadDetail
  await attachRmNames([lead])
  return lead
}

export type UpdateStatusResult = { ok: true; status: LeadStatus } | { ok: false; error: string }

/**
 * Update a lead's status. RLS gates this: if the caller lacks UPDATE scope, the
 * statement matches zero rows and we report a permission error — no bypass.
 * The DB triggers handle auditing (lead_stage_history + activity_logs).
 */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<UpdateStatusResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, status')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data)
    return { ok: false, error: 'Lead not found or you do not have permission to update it.' }
  return { ok: true, status: data.status as LeadStatus }
}
