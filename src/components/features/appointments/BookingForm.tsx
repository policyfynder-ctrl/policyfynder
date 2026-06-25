'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/features/auth/FormField'
import { FormError } from '@/components/features/auth/FormBanner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { validateBooking, type BookingFieldErrors } from '@/lib/booking/validation'
import { SlotPicker, type SelectedSlot } from './SlotPicker'
import type { AvailableSlot, ProductOption } from '@/services/booking'

type Status = 'idle' | 'submitting' | 'success'

// Orchestrates the public booking: pick a slot, enter details, submit to /api/book,
// then show a confirmation. Server-side validation in the API route is authoritative;
// the client checks first for fast feedback.
export function BookingForm({
  branchCode,
  slots,
  products,
}: {
  branchCode: string
  slots: AvailableSlot[]
  products: ProductOption[]
}) {
  const [slot, setSlot] = useState<SelectedSlot | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({})
  const [formError, setFormError] = useState<string | undefined>()
  const [status, setStatus] = useState<Status>('idle')
  const [confirmation, setConfirmation] = useState<{ token: string; slot: SelectedSlot } | null>(
    null
  )

  function toggleInterest(slug: string) {
    setInterests((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(undefined)

    const form = new FormData(e.currentTarget)
    const input = {
      branchCode,
      slotDate: slot?.slotDate ?? '',
      slotStart: slot?.slotStart ?? '',
      slotEnd: slot?.slotEnd ?? '',
      firstName: String(form.get('firstName') ?? ''),
      lastName: String(form.get('lastName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      insuranceInterest: interests,
    }

    const errors = validateBooking(input)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      if (errors.slotStart) setFormError('Please choose an appointment slot above.')
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setFieldErrors(data.fieldErrors ?? {})
        setFormError(data.error ?? 'Something went wrong. Please try again.')
        setStatus('idle')
        return
      }
      setConfirmation({ token: data.confirmationToken, slot: slot! })
      setStatus('success')
    } catch {
      setFormError('Network error. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'success' && confirmation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Appointment confirmed 🎉</CardTitle>
          <CardDescription>
            We&apos;ve booked your slot. A relationship manager will reach out to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">When: </span>
            <span className="font-medium">
              {new Date(
                `${confirmation.slot.slotDate}T${confirmation.slot.slotStart}`
              ).toLocaleString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Confirmation code: </span>
            <span className="font-mono font-medium">{confirmation.token}</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Choose a time</CardTitle>
        </CardHeader>
        <CardContent>
          <SlotPicker slots={slots} value={slot} onSelect={setSlot} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormError message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="First name"
              name="firstName"
              autoComplete="given-name"
              error={fieldErrors.firstName}
              required
            />
            <FormField
              label="Last name"
              name="lastName"
              autoComplete="family-name"
              error={fieldErrors.lastName}
              required
            />
          </div>
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            error={fieldErrors.email}
            required
          />
          <FormField
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            error={fieldErrors.phone}
            required
          />

          {products.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Insurance interest (optional)</p>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => {
                  const checked = interests.includes(p.slug)
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => toggleInterest(p.slug)}
                      aria-pressed={checked}
                      className={
                        'rounded-md border px-3 py-1.5 text-sm transition-colors ' +
                        (checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:bg-muted')
                      }
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Booking…' : 'Book appointment'}
      </Button>
    </form>
  )
}
