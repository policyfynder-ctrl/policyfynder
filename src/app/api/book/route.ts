import { NextResponse } from 'next/server'
import { createBooking, type BookingInput } from '@/services/booking'
import { validateBooking, normalisePhone } from '@/lib/booking/validation'

// Public booking endpoint. No auth — anonymous customers submit here. The privileged
// work (RM assignment, lead + appointment insert) happens server-side in
// createBooking via the service-role client; the service key never reaches the browser.
export async function POST(request: Request) {
  let body: Partial<BookingInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const input: BookingInput = {
    branchCode: String(body.branchCode ?? ''),
    slotDate: String(body.slotDate ?? ''),
    slotStart: String(body.slotStart ?? ''),
    slotEnd: String(body.slotEnd ?? ''),
    firstName: String(body.firstName ?? '').trim(),
    lastName: String(body.lastName ?? '').trim(),
    email: String(body.email ?? '').trim(),
    phone: normalisePhone(String(body.phone ?? '')),
    insuranceInterest: Array.isArray(body.insuranceInterest)
      ? body.insuranceInterest.map(String)
      : [],
  }

  const fieldErrors = validateBooking(input)
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { ok: false, error: 'Please fix the highlighted fields.', fieldErrors },
      { status: 400 }
    )
  }

  const result = await createBooking(input)
  if (!result.ok) {
    const status =
      result.code === 'BRANCH_NOT_FOUND' ? 404 : result.code === 'SLOT_FULL' ? 409 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, confirmationToken: result.confirmationToken })
}
