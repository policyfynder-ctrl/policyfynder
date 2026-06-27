import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Booking data layer for the public /book/[branch] page.
//
// Reads (branch lookup, slot availability) use the anonymous server client —
// the relevant tables/views have public-read RLS, so no privileges are needed.
//
// The WRITE (createBooking) uses the admin/service-role client because it must:
//   1. read appointments to avoid double-booking a specific RM (anon cannot read
//      appointments), and
//   2. assign an RM (appointments.rm_id is NOT NULL).
// It is only ever called from the server-side /api/book route handler.

export type BranchSummary = {
  id: string
  name: string
  code: string
  timezone: string
}

export type AvailableSlot = {
  slotDate: string // YYYY-MM-DD
  slotStart: string // HH:MM:SS
  slotEnd: string // HH:MM:SS
  availableSpots: number
}

export type BookingInput = {
  branchCode: string
  slotDate: string
  slotStart: string
  slotEnd: string
  firstName: string
  lastName: string
  email: string
  phone: string
  insuranceInterest: string[]
}

export type BookingErrorCode = 'VALIDATION' | 'BRANCH_NOT_FOUND' | 'SLOT_FULL' | 'SERVER'

export type BookingResult =
  | { ok: true; confirmationToken: string; slotDate: string; slotStart: string }
  | { ok: false; code: BookingErrorCode; error: string }

/** Resolve a branch by its URL slug. Only active branches are bookable. */
export async function getBranchByCode(code: string): Promise<BranchSummary | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('branches')
    .select('id, name, code, timezone')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()
  return data && data.code ? (data as BranchSummary) : null
}

/** Upcoming bookable slots for a branch (available_spots > 0, not in the past). */
export async function getAvailableSlots(branchId: string): Promise<AvailableSlot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_slot_availability')
    .select('slot_date, slot_start, slot_end, available_spots')
    .eq('branch_id', branchId)
    .gt('available_spots', 0)
    .order('slot_date', { ascending: true })
    .order('slot_start', { ascending: true })
  if (error || !data) return []

  const now = new Date()
  return data
    .map((r) => ({
      slotDate: r.slot_date as string,
      slotStart: r.slot_start as string,
      slotEnd: r.slot_end as string,
      availableSpots: r.available_spots as number,
    }))
    .filter((s) => new Date(`${s.slotDate}T${s.slotStart}`) > now)
}

/** All bookable (active) branches — drives the public /book branch selector. */
export async function listActiveBranches(): Promise<BranchSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('branches')
    .select('id, name, code, timezone')
    .eq('is_active', true)
    .order('name', { ascending: true })
  return (data ?? []).filter((b) => b.code) as BranchSummary[]
}

export type ProductOption = { slug: string; name: string }

/** Active insurance products, for the "what are you interested in?" picker. */
export async function getActiveProducts(): Promise<ProductOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('insurance_products')
    .select('slug, name')
    .eq('is_active', true)
    .order('name', { ascending: true })
  return (data ?? []).map((p) => ({ slug: p.slug, name: p.name }))
}

const TERMINAL_APPT = new Set(['cancelled', 'no_show'])

/**
 * Create a lead + appointment for an anonymous booking.
 * Picks the least-busy eligible RM for the slot. Returns a confirmation token.
 *
 * Race note: RM selection and insert are not a single locked transaction, so two
 * simultaneous bookings could in theory pick the same RM. The DB capacity trigger
 * caps gross overbooking; tightening to a fully serialised SECURITY DEFINER
 * function is a future hardening (tracked in MEMORY.md).
 */
export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const admin = createAdminClient()

  const branchRes = await admin
    .from('branches')
    .select('id')
    .eq('code', input.branchCode)
    .eq('is_active', true)
    .maybeSingle()
  const branch = branchRes.data
  if (!branch) return { ok: false, code: 'BRANCH_NOT_FOUND', error: 'Branch not found.' }

  // Day-of-week, Sunday=0..Saturday=6 (matches Postgres EXTRACT(DOW)).
  const dow = new Date(`${input.slotDate}T00:00:00Z`).getUTCDay()

  // Candidate RMs in this branch.
  const { data: rms } = await admin
    .from('relationship_managers')
    .select('id, max_daily_appointments')
    .eq('branch_id', branch.id)
    .eq('is_active', true)
    .is('deleted_at', null)
  if (!rms || rms.length === 0) {
    return { ok: false, code: 'SLOT_FULL', error: 'No availability for this slot.' }
  }
  const rmIds = rms.map((r) => r.id)

  // Schedules covering this slot.
  const { data: schedules } = await admin
    .from('rm_schedules')
    .select('rm_id')
    .in('rm_id', rmIds)
    .eq('day_of_week', dow)
    .eq('is_active', true)
    .lte('start_time', input.slotStart)
    .gt('end_time', input.slotStart)
    .lte('effective_from', input.slotDate)
  const scheduledRmIds = new Set((schedules ?? []).map((s) => s.rm_id))

  // Leave for that date.
  const { data: leaves } = await admin
    .from('rm_leave')
    .select('rm_id, leave_type, start_time, end_time')
    .in('rm_id', rmIds)
    .eq('leave_date', input.slotDate)
  const onLeave = new Set(
    (leaves ?? [])
      .filter((l) => {
        if (l.leave_type === 'full_day') return true
        if (l.leave_type === 'custom') {
          return (
            l.start_time != null &&
            l.end_time != null &&
            l.start_time <= input.slotStart &&
            l.end_time > input.slotStart
          )
        }
        if (l.leave_type === 'morning') return input.slotStart < '13:00:00'
        if (l.leave_type === 'afternoon') return input.slotStart >= '13:00:00'
        return false
      })
      .map((l) => l.rm_id)
  )

  // Existing appointments that day (for daily cap + exact-slot conflicts).
  const { data: appts } = await admin
    .from('appointments')
    .select('rm_id, start_time, status')
    .eq('appointment_date', input.slotDate)
    .in('rm_id', rmIds)
    .is('deleted_at', null)
  const dailyCount = new Map<string, number>()
  const bookedAtSlot = new Set<string>()
  for (const a of appts ?? []) {
    if (TERMINAL_APPT.has(a.status)) continue
    dailyCount.set(a.rm_id, (dailyCount.get(a.rm_id) ?? 0) + 1)
    if (a.start_time === input.slotStart) bookedAtSlot.add(a.rm_id)
  }

  // Eligible = scheduled, not on leave, not booked at this slot, under daily cap.
  const eligible = rms
    .filter(
      (rm) =>
        scheduledRmIds.has(rm.id) &&
        !onLeave.has(rm.id) &&
        !bookedAtSlot.has(rm.id) &&
        (dailyCount.get(rm.id) ?? 0) < rm.max_daily_appointments
    )
    .sort((a, b) => (dailyCount.get(a.id) ?? 0) - (dailyCount.get(b.id) ?? 0))

  const chosen = eligible[0]
  if (!chosen) return { ok: false, code: 'SLOT_FULL', error: 'No availability for this slot.' }

  // Resolve the 'direct' lead source (booking page).
  const { data: source } = await admin
    .from('lead_sources')
    .select('id')
    .eq('slug', 'direct')
    .maybeSingle()

  // Insert the lead.
  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      source: 'direct',
      source_id: source?.id ?? null,
      branch_id: branch.id,
      status: 'scheduled',
      insurance_interest: input.insuranceInterest,
    })
    .select('id')
    .single()
  if (leadErr || !lead) {
    return { ok: false, code: 'SERVER', error: 'Could not create your booking. Please try again.' }
  }

  // Insert the appointment. The capacity trigger is the final overbooking guard;
  // if it rejects, clean up the orphaned lead.
  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .insert({
      lead_id: lead.id,
      rm_id: chosen.id,
      branch_id: branch.id,
      appointment_date: input.slotDate,
      start_time: input.slotStart,
      end_time: input.slotEnd,
      status: 'scheduled',
    })
    .select('confirmation_token')
    .single()

  if (apptErr || !appt?.confirmation_token) {
    await admin.from('leads').delete().eq('id', lead.id)
    return { ok: false, code: 'SLOT_FULL', error: 'That slot was just taken. Please pick another.' }
  }

  return {
    ok: true,
    confirmationToken: appt.confirmation_token,
    slotDate: input.slotDate,
    slotStart: input.slotStart,
  }
}
