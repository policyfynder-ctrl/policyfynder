// Shared validation for the booking form (used by the API route and re-usable on
// the client). Dependency-free, mirrors the auth validation style.

import type { BookingInput } from '@/services/booking'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 8–15 digits, optional leading +, spaces/dashes tolerated then stripped.
const PHONE_RE = /^\+?[0-9]{8,15}$/

export type BookingFieldErrors = Partial<Record<keyof BookingInput, string>>

export function validateBooking(input: Partial<BookingInput>): BookingFieldErrors {
  const errors: BookingFieldErrors = {}

  if (!input.slotDate || !input.slotStart || !input.slotEnd) {
    errors.slotStart = 'Please choose an appointment slot'
  }
  if (!input.firstName?.trim()) errors.firstName = 'First name is required'
  if (!input.lastName?.trim()) errors.lastName = 'Last name is required'
  if (!input.email?.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(input.email.trim())) errors.email = 'Enter a valid email address'

  const phone = (input.phone ?? '').replace(/[\s-]/g, '')
  if (!phone) errors.phone = 'Phone number is required'
  else if (!PHONE_RE.test(phone)) errors.phone = 'Enter a valid phone number'

  return errors
}

export function normalisePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '')
}
