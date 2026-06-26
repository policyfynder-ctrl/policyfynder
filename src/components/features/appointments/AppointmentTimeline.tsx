import { activityActionLabel } from '@/lib/appointments'
import type { ActivityEntry } from '@/services/appointments'

// Renders the appointment's activity_logs entries (RLS-scoped).
export function AppointmentTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
  }

  return (
    <ol className="space-y-3">
      {entries.map((e) => {
        const meta = (e.metadata ?? {}) as { from?: string; to?: string }
        const transition = meta.from && meta.to ? ` (${meta.from} → ${meta.to})` : ''
        return (
          <li key={e.id} className="flex items-start gap-3 text-sm">
            <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
            <div>
              <p className="font-medium">
                {activityActionLabel(e.action)}
                <span className="text-muted-foreground font-normal">{transition}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {new Date(e.created_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
