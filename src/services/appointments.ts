import { createClient } from '@/lib/supabase/server'
import type { AppointmentStatus } from '@/types'
import { staffNameMap } from './staff'

// Appointment data access. Session/RLS client only — RM sees own, managers see
// branch/team, super admin sees all. No admin/service-role client here.

export type AppointmentRow = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  created_at: string
  lead: { id: string; first_name: string; last_name: string; email: string; phone: string } | null
  rm: { id: string; profile: { full_name: string | null } | null } | null
  branch: { name: string } | null
}

// RM NAME comes from v_staff_directory (migration 019), resolved after the query
// — not via a profiles embed, which is self+admin only.
const LIST_SELECT =
  'id, appointment_date, start_time, end_time, status, created_at,' +
  ' lead:leads(id, first_name, last_name, email, phone),' +
  ' rm:relationship_managers(id),' +
  ' branch:branches(name)'

/** Attach RM display names from the staff directory view (in place). */
async function attachRmNames(rows: { rm: AppointmentRow['rm'] }[]): Promise<void> {
  const names = await staffNameMap(rows.map((r) => r.rm?.id))
  for (const r of rows) {
    if (r.rm) r.rm.profile = { full_name: names.get(r.rm.id) ?? null }
  }
}

/** Appointments visible to the current user (RLS-scoped). */
export async function listAppointments(opts?: {
  status?: AppointmentStatus
  upcomingOnly?: boolean
}): Promise<AppointmentRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('appointments')
    .select(LIST_SELECT)
    .is('deleted_at', null)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (opts?.status) query = query.eq('status', opts.status)
  if (opts?.upcomingOnly) {
    const today = new Date().toISOString().slice(0, 10)
    query = query.gte('appointment_date', today)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as unknown as AppointmentRow[]
  await attachRmNames(rows)
  return rows
}

export type AppointmentDetail = AppointmentRow & {
  confirmation_token: string | null
  cancellation_reason: string | null
  notes: string | null
  rescheduled_from_id: string | null
  branch_id: string | null
}

const DETAIL_SELECT =
  LIST_SELECT + ', confirmation_token, cancellation_reason, notes, rescheduled_from_id, branch_id'

/** A single appointment, or null if not found / outside the viewer's RLS scope. */
export async function getAppointment(id: string): Promise<AppointmentDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const appt = data as unknown as AppointmentDetail
  await attachRmNames([appt])
  return appt
}

export type ActivityEntry = {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

/** Activity timeline for an appointment (RLS-scoped via migration 016). */
export async function getAppointmentActivity(id: string): Promise<ActivityEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, metadata, created_at')
    .eq('entity_type', 'appointment')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
  if (error) return [] // timeline is non-critical; never break the page
  return (data ?? []) as ActivityEntry[]
}

export type AppointmentActionResult = { ok: true } | { ok: false; error: string }

/**
 * Update appointment status (confirmed/completed/cancelled/no_show/scheduled).
 * RLS gates the update; the status trigger writes the specific audit action.
 */
export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  cancellationReason?: string
): Promise<AppointmentActionResult> {
  const supabase = await createClient()
  const patch: { status: AppointmentStatus; cancellation_reason?: string } = { status }
  if (status === 'cancelled' && cancellationReason) patch.cancellation_reason = cancellationReason

  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Appointment not found or not permitted.' }
  return { ok: true }
}

export type RescheduleResult = { ok: true; newAppointmentId: string } | { ok: false; error: string }

/**
 * Reschedule by creating a new appointment (rescheduled_from_id → old) for the same
 * RM/lead/branch at the new slot, then marking the old one 'rescheduled'. Availability
 * is checked via the get_slot_availability RPC and enforced by the capacity trigger.
 * Both the new row (appointment.booked) and the old row (appointment.rescheduled) are
 * audited by existing triggers. No admin client — RLS gates every statement.
 */
export async function rescheduleAppointment(
  id: string,
  slotDate: string,
  slotStart: string,
  slotEnd: string
): Promise<RescheduleResult> {
  const supabase = await createClient()

  const current = await getAppointment(id)
  if (!current) return { ok: false, error: 'Appointment not found or not permitted.' }
  if (current.status === 'cancelled' || current.status === 'completed') {
    return { ok: false, error: `Cannot reschedule a ${current.status} appointment.` }
  }
  if (!current.lead?.id || !current.rm?.id) {
    return { ok: false, error: 'Appointment is missing lead or RM data.' }
  }
  if (new Date(`${slotDate}T${slotStart}`) <= new Date()) {
    return { ok: false, error: 'Choose a future time slot.' }
  }

  // Pre-check availability (capacity trigger is the hard backstop).
  const { data: avail } = await supabase.rpc('get_slot_availability', {
    p_date: slotDate,
    p_start_time: slotStart,
    p_branch_id: current.branch_id ?? undefined,
  })
  if ((avail ?? 0) <= 0) return { ok: false, error: 'That slot is no longer available.' }

  // Create the new appointment (capacity trigger validates on insert).
  const { data: created, error: insErr } = await supabase
    .from('appointments')
    .insert({
      lead_id: current.lead.id,
      rm_id: current.rm.id,
      branch_id: current.branch_id,
      appointment_date: slotDate,
      start_time: slotStart,
      end_time: slotEnd,
      status: 'scheduled',
      rescheduled_from_id: id,
    })
    .select('id')
    .single()

  if (insErr || !created) {
    return { ok: false, error: 'That slot is no longer available.' }
  }

  // Mark the old appointment rescheduled (triggers the audit entry).
  const { error: updErr } = await supabase
    .from('appointments')
    .update({ status: 'rescheduled' })
    .eq('id', id)
  if (updErr) {
    // Roll back the new row so we don't leave a duplicate.
    await supabase.from('appointments').delete().eq('id', created.id)
    return { ok: false, error: 'Could not complete the reschedule. Please try again.' }
  }

  return { ok: true, newAppointmentId: created.id }
}
