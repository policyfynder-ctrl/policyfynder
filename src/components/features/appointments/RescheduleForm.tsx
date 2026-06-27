'use client'

import { useActionState, useState } from 'react'
import {
  rescheduleAppointmentAction,
  type ApptActionState,
} from '@/app/dashboard/appointments/actions'
import { SlotPicker, type SelectedSlot } from './SlotPicker'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import type { AvailableSlot } from '@/services/booking'

// Reschedule to a new available slot. Reuses the public SlotPicker; the chosen slot
// is carried to the server action via hidden inputs. Availability + capacity are
// validated server-side.
export function RescheduleForm({
  appointmentId,
  slots,
}: {
  appointmentId: string
  slots: AvailableSlot[]
}) {
  const [slot, setSlot] = useState<SelectedSlot | null>(null)
  const [state, action, pending] = useActionState<ApptActionState, FormData>(
    rescheduleAppointmentAction,
    undefined
  )

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input type="hidden" name="slot_date" value={slot?.slotDate ?? ''} />
      <input type="hidden" name="slot_start" value={slot?.slotStart ?? ''} />
      <input type="hidden" name="slot_end" value={slot?.slotEnd ?? ''} />
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <SlotPicker slots={slots} value={slot} onSelect={setSlot} />
      <Button type="submit" size="sm" disabled={pending || !slot}>
        {pending ? 'Rescheduling…' : 'Reschedule'}
      </Button>
    </form>
  )
}
