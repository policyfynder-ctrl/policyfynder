'use client'

import { cn } from '@/lib/utils'
import type { AvailableSlot } from '@/services/booking'

export type SelectedSlot = { slotDate: string; slotStart: string; slotEnd: string }

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(time: string): string {
  const d = new Date(`2000-01-01T${time}`)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Date-grouped time grid. Presentational: parent owns the selection.
export function SlotPicker({
  slots,
  value,
  onSelect,
}: {
  slots: AvailableSlot[]
  value: SelectedSlot | null
  onSelect: (slot: SelectedSlot) => void
}) {
  if (slots.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-6 text-center text-sm">
        No appointment slots are available right now. Please check back later.
      </p>
    )
  }

  const byDate = slots.reduce<Record<string, AvailableSlot[]>>((acc, s) => {
    ;(acc[s.slotDate] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(byDate).map(([date, daySlots]) => (
        <div key={date}>
          <p className="mb-2 text-sm font-medium">{formatDay(date)}</p>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((s) => {
              const selected = value?.slotDate === s.slotDate && value?.slotStart === s.slotStart
              return (
                <button
                  key={`${s.slotDate}-${s.slotStart}`}
                  type="button"
                  onClick={() =>
                    onSelect({ slotDate: s.slotDate, slotStart: s.slotStart, slotEnd: s.slotEnd })
                  }
                  aria-pressed={selected}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  {formatTime(s.slotStart)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
