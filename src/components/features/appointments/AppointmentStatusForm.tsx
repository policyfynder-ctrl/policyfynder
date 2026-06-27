'use client'

import { useActionState } from 'react'
import {
  updateAppointmentStatusAction,
  type ApptActionState,
} from '@/app/dashboard/appointments/actions'
import { ASSIGNABLE_APPOINTMENT_STATUSES, appointmentStatusLabel } from '@/lib/appointments'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import type { AppointmentStatus } from '@/types'

// Status updater for confirmed/completed/no_show/scheduled. Cancellation has its
// own form (with reason); rescheduling has its own flow.
export function AppointmentStatusForm({
  appointmentId,
  current,
}: {
  appointmentId: string
  current: AppointmentStatus
}) {
  const [state, action, pending] = useActionState<ApptActionState, FormData>(
    updateAppointmentStatusAction,
    undefined
  )

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <div className="flex items-center gap-2">
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={ASSIGNABLE_APPOINTMENT_STATUSES.includes(current) ? current : 'scheduled'}
          className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border px-3 text-sm focus-visible:ring-3 focus-visible:outline-none"
        >
          {ASSIGNABLE_APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {appointmentStatusLabel(s)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Update status'}
        </Button>
      </div>
    </form>
  )
}
