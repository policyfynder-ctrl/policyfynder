import { listMyAppointments } from '@/services/portal'
import { listMyChangeRequests } from '@/services/changeRequests'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppointmentStatusBadge } from '@/components/features/appointments/AppointmentStatusBadge'
import { ChangeRequestForm } from '@/components/features/portal/ChangeRequestForm'

export const metadata = { title: 'My Appointments — PolicyFynder' }

function fmt(d: string, t: string) {
  return new Date(`${d}T${t}`).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function MyAppointmentsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [appts, requests] = await Promise.all([listMyAppointments(), listMyChangeRequests()])
  const pendingByAppt = new Map(
    requests.filter((r) => r.status === 'pending').map((r) => [r.appointment_id, r])
  )

  const upcoming = appts.filter((a) => a.appointment_date >= today && !['cancelled', 'no_show'].includes(a.status))
  const past = appts.filter((a) => a.appointment_date < today || ['cancelled', 'no_show', 'completed'].includes(a.status))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My Appointments</h1>
        <p className="text-muted-foreground text-sm">Request a cancellation or reschedule — your RM will confirm.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming appointments.</p>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((a) => {
                const pending = pendingByAppt.get(a.id)
                return (
                  <li key={a.id} className="border-border rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{fmt(a.appointment_date, a.start_time)}</p>
                        <p className="text-muted-foreground text-xs">{a.branch?.name ?? ''}</p>
                      </div>
                      <AppointmentStatusBadge status={a.status} />
                    </div>
                    <div className="mt-3">
                      {pending ? (
                        <Badge variant="secondary">
                          {pending.type === 'cancel' ? 'Cancellation' : 'Reschedule'} request pending
                        </Badge>
                      ) : (
                        <ChangeRequestForm appointmentId={a.id} />
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past & cancelled</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing here yet.</p>
          ) : (
            <ul className="divide-border divide-y">
              {past.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>{fmt(a.appointment_date, a.start_time)}</span>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
