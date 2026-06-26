// Pure RM/schedule helpers (no server imports).

// Postgres DOW: 0 = Sunday … 6 = Saturday.
export const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function dayLabel(dow: number): string {
  return DAY_LABELS[dow] ?? `Day ${dow}`
}

export function fmtTime(t: string): string {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
