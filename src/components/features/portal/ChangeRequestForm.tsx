'use client'

import { useActionState, useState } from 'react'
import { requestChangeAction, type RequestActionState } from '@/app/(dashboard)/my-appointments/actions'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'

const ctrl =
  'border-border bg-background h-9 w-full rounded-lg border px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none'

// Lets a customer request a cancel or reschedule for one of their appointments.
// The request goes to their RM for approval; the appointment is never mutated here.
export function ChangeRequestForm({ appointmentId }: { appointmentId: string }) {
  const [state, action, pending] = useActionState<RequestActionState, FormData>(requestChangeAction, undefined)
  const [mode, setMode] = useState<'none' | 'cancel' | 'reschedule'>('none')

  if (state?.success) {
    return <FormSuccess message={state.success} />
  }

  return (
    <div className="space-y-3">
      <FormError message={state?.error} />
      {mode === 'none' && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setMode('reschedule')}>
            Request reschedule
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMode('cancel')}>
            Request cancellation
          </Button>
        </div>
      )}

      {mode === 'cancel' && (
        <form action={action} className="space-y-2">
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <input type="hidden" name="type" value="cancel" />
          <textarea name="reason" placeholder="Reason (optional)" className={ctrl + ' h-16 py-2'} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Sending…' : 'Send cancellation request'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setMode('none')}>
              Back
            </Button>
          </div>
        </form>
      )}

      {mode === 'reschedule' && (
        <form action={action} className="space-y-2">
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <input type="hidden" name="type" value="reschedule" />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs">
              Preferred date
              <input type="date" name="preferred_date" required className={ctrl} />
            </label>
            <label className="space-y-1 text-xs">
              Preferred time
              <input type="time" name="preferred_time" className={ctrl} />
            </label>
          </div>
          <textarea name="reason" placeholder="Note (optional)" className={ctrl + ' h-16 py-2'} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Sending…' : 'Send reschedule request'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setMode('none')}>
              Back
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
