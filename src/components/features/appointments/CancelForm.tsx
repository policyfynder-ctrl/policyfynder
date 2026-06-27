'use client'

import { useActionState } from 'react'
import {
  cancelAppointmentAction,
  type ApptActionState,
} from '@/app/dashboard/appointments/actions'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'

// Cancel an appointment with an optional reason.
export function CancelForm({ appointmentId }: { appointmentId: string }) {
  const [state, action, pending] = useActionState<ApptActionState, FormData>(
    cancelAppointmentAction,
    undefined
  )

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <textarea
        name="reason"
        rows={2}
        placeholder="Reason (optional)"
        className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-3 focus-visible:outline-none"
      />
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {pending ? 'Cancelling…' : 'Cancel appointment'}
      </Button>
    </form>
  )
}
