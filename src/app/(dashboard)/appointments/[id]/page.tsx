import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAppointment, getAppointmentActivity } from '@/services/appointments'
import { getAvailableSlots } from '@/services/booking'
import { hasPermission } from '@/services/roles'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { AppointmentStatusBadge } from '@/components/features/appointments/AppointmentStatusBadge'
import { AppointmentStatusForm } from '@/components/features/appointments/AppointmentStatusForm'
import { CancelForm } from '@/components/features/appointments/CancelForm'
import { RescheduleForm } from '@/components/features/appointments/RescheduleForm'
import { AppointmentTimeline } from '@/components/features/appointments/AppointmentTimeline'

export const metadata = { title: 'Appointment — PolicyFynder' }

function fmtWhen(d: string, t: string) {
  return new Date(`${d}T${t}`).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [appt, canUpdate, canCancel] = await Promise.all([
    getAppointment(id),
    hasPermission('appointments', 'update'),
    hasPermission('appointments', 'cancel'),
  ])
  if (!appt) notFound()

  const [activity, slots] = await Promise.all([
    getAppointmentActivity(id),
    canUpdate && appt.branch_id ? getAvailableSlots(appt.branch_id) : Promise.resolve([]),
  ])

  const isClosed = appt.status === 'cancelled' || appt.status === 'rescheduled'
  const rmName = appt.rm?.profile?.full_name ?? 'Unassigned'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/appointments"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Back to appointments
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {fmtWhen(appt.appointment_date, appt.start_time)}
          </h1>
          <AppointmentStatusBadge status={appt.status} />
        </div>
        {appt.cancellation_reason && (
          <p className="text-muted-foreground mt-1 text-sm">
            Cancellation reason: {appt.cancellation_reason}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer &amp; lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {appt.lead ? (
              <>
                <p className="font-medium">
                  {appt.lead.first_name} {appt.lead.last_name}
                </p>
                <p className="text-muted-foreground">{appt.lead.email}</p>
                <p className="text-muted-foreground">{appt.lead.phone}</p>
                <Link
                  href={`/dashboard/leads/${appt.lead.id}`}
                  className="text-foreground inline-block pt-1 hover:underline"
                >
                  View lead →
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">No lead linked.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p>
              <span className="text-muted-foreground">RM: </span>
              {rmName}
            </p>
            <p>
              <span className="text-muted-foreground">Branch: </span>
              {appt.branch?.name ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Confirmation: </span>
              <span className="font-mono text-xs">{appt.confirmation_token ?? '—'}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {canUpdate && !isClosed && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Update status</CardTitle>
              <CardDescription>Recorded in the activity timeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentStatusForm appointmentId={appt.id} current={appt.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reschedule</CardTitle>
              <CardDescription>Pick a new available slot.</CardDescription>
            </CardHeader>
            <CardContent>
              <RescheduleForm appointmentId={appt.id} slots={slots} />
            </CardContent>
          </Card>
        </div>
      )}

      {canCancel && !isClosed && appt.status !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Cancel appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <CancelForm appointmentId={appt.id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentTimeline entries={activity} />
        </CardContent>
      </Card>
    </div>
  )
}
