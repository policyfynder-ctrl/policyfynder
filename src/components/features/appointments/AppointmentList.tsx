import Link from 'next/link'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import type { AppointmentRow } from '@/services/appointments'

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
function fmtTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function AppointmentList({ appointments }: { appointments: AppointmentRow[] }) {
  if (appointments.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-4 py-10 text-center text-sm">
        No appointments to show.
      </p>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-4 py-2 font-medium">When</th>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">RM</th>
            <th className="hidden px-4 py-2 font-medium md:table-cell">Branch</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id} className="border-border hover:bg-muted/30 border-t">
              <td className="px-4 py-2.5">
                <Link
                  href={`/dashboard/appointments/${a.id}`}
                  className="text-foreground font-medium hover:underline"
                >
                  {fmtDate(a.appointment_date)}
                </Link>
                <div className="text-muted-foreground text-xs">
                  {fmtTime(a.start_time)}–{fmtTime(a.end_time)}
                </div>
              </td>
              <td className="px-4 py-2.5">
                {a.lead ? `${a.lead.first_name} ${a.lead.last_name}` : '—'}
              </td>
              <td className="px-4 py-2.5">
                <AppointmentStatusBadge status={a.status} />
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">
                {a.rm?.profile?.full_name ?? '—'}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">
                {a.branch?.name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
