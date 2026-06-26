import Link from 'next/link'
import { listAppointments } from '@/services/appointments'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AppointmentStatusBadge } from '@/components/features/appointments/AppointmentStatusBadge'

function fmtWhen(d: string, t: string) {
  return new Date(`${d}T${t}`).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Dashboard widget: the viewer's next few upcoming appointments (RLS-scoped).
export async function UpcomingAppointments({ limit = 5 }: { limit?: number }) {
  const upcoming = (await listAppointments({ upcomingOnly: true })).slice(0, limit)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Upcoming appointments</CardTitle>
        <Link
          href="/dashboard/appointments"
          className="text-muted-foreground text-xs hover:underline"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming appointments.</p>
        ) : (
          <ul className="divide-border divide-y">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link
                  href={`/dashboard/appointments/${a.id}`}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <span className="font-medium">{fmtWhen(a.appointment_date, a.start_time)}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {a.lead ? `${a.lead.first_name} ${a.lead.last_name}` : '—'}
                  </span>
                </Link>
                <AppointmentStatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
