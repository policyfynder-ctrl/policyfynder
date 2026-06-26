'use client'

import { useActionState } from 'react'
import {
  addScheduleAction,
  deleteScheduleForm,
  type RmActionState,
} from '@/app/(dashboard)/rms/actions'
import { DAY_LABELS, dayLabel, fmtTime } from '@/lib/rms'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import type { RmSchedule } from '@/services/rms'

export function RmScheduleEditor({ rmId, schedules }: { rmId: string; schedules: RmSchedule[] }) {
  const [state, action, pending] = useActionState<RmActionState, FormData>(
    addScheduleAction,
    undefined
  )

  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <p className="text-muted-foreground text-sm">No weekly hours set.</p>
      ) : (
        <ul className="space-y-1.5">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="border-border flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
            >
              <span>
                <span className="font-medium">{dayLabel(s.day_of_week)}</span>{' '}
                {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
              </span>
              <form action={deleteScheduleForm}>
                <input type="hidden" name="schedule_id" value={s.id} />
                <input type="hidden" name="rm_id" value={rmId} />
                <Button type="submit" size="xs" variant="ghost">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="border-border space-y-2 border-t pt-3">
        <FormError message={state?.error} />
        <FormSuccess message={state?.success} />
        <div className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="rm_id" value={rmId} />
          <select
            name="day_of_week"
            defaultValue="1"
            className="border-border bg-background h-9 rounded-lg border px-2 text-sm"
          >
            {DAY_LABELS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="time"
            name="start_time"
            defaultValue="10:00"
            className="border-border bg-background h-9 rounded-lg border px-2 text-sm"
          />
          <input
            type="time"
            name="end_time"
            defaultValue="18:00"
            className="border-border bg-background h-9 rounded-lg border px-2 text-sm"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Adding…' : 'Add hours'}
          </Button>
        </div>
      </form>
    </div>
  )
}
