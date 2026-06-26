import { createClient } from '@/lib/supabase/server'
import { updateAppointmentStatus } from './appointments'

// Appointment change requests (migration 025). Customers REQUEST a cancel/reschedule
// for their own appointment (RLS gates ownership); an RM/manager resolves it. No
// admin client — RLS is the boundary on both sides.

export type ChangeRequest = {
  id: string
  appointment_id: string
  type: 'cancel' | 'reschedule'
  preferred_date: string | null
  preferred_time: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'declined'
  created_at: string
}

export type RequestResult = { ok: true; id: string } | { ok: false; error: string }

/** Customer files a change request for their own appointment. RLS enforces ownership. */
export async function createChangeRequest(input: {
  appointmentId: string
  type: 'cancel' | 'reschedule'
  preferredDate?: string | null
  preferredTime?: string | null
  reason?: string | null
}): Promise<RequestResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  if (input.type === 'reschedule' && !input.preferredDate) {
    return { ok: false, error: 'Please choose a preferred date for the reschedule.' }
  }
  const { data, error } = await supabase
    .from('appointment_change_requests')
    .insert({
      appointment_id: input.appointmentId,
      requested_by: user.id,
      type: input.type,
      preferred_date: input.preferredDate ?? null,
      preferred_time: input.preferredTime ?? null,
      reason: input.reason ?? null,
    })
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Could not file this request (not your appointment?).' }
  return { ok: true, id: data.id }
}

/** All of the current customer's change requests (RLS: requested_by = auth.uid()). */
export async function listMyChangeRequests(): Promise<ChangeRequest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointment_change_requests')
    .select('id, appointment_id, type, preferred_date, preferred_time, reason, status, created_at')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as ChangeRequest[]
}

/** Requests for an appointment — RLS returns the customer's own or the staff's scoped set. */
export async function listRequestsForAppointment(appointmentId: string): Promise<ChangeRequest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointment_change_requests')
    .select('id, appointment_id, type, preferred_date, preferred_time, reason, status, created_at')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as ChangeRequest[]
}

/**
 * RM/manager resolves a request. Approving a CANCEL also cancels the appointment;
 * approving a RESCHEDULE just records approval (the RM then uses the existing
 * reschedule control to pick the confirmed slot). RLS gates the update to scope.
 */
export async function resolveChangeRequest(
  id: string,
  decision: 'approved' | 'declined'
): Promise<RequestResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: req, error: readErr } = await supabase
    .from('appointment_change_requests')
    .select('id, appointment_id, type, reason, status')
    .eq('id', id)
    .maybeSingle()
  if (readErr || !req) return { ok: false, error: 'Request not found or out of scope.' }
  if (req.status !== 'pending') return { ok: false, error: 'This request is already resolved.' }

  const { data, error } = await supabase
    .from('appointment_change_requests')
    .update({ status: decision, resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Not permitted to resolve this request.' }

  if (decision === 'approved' && req.type === 'cancel') {
    const res = await updateAppointmentStatus(
      req.appointment_id as string,
      'cancelled',
      req.reason ?? 'Customer requested cancellation'
    )
    if (!res.ok) return { ok: false, error: `Approved, but could not cancel: ${res.error}` }
  }
  return { ok: true, id: data.id }
}
