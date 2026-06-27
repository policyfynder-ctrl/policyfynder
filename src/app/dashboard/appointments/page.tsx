import Link from 'next/link'
import { listAppointments } from '@/services/appointments'
import { AppointmentList } from '@/components/features/appointments/AppointmentList'
import {
  APPOINTMENT_STATUSES,
  appointmentStatusLabel,
  isAppointmentStatus,
} from '@/lib/appointments'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Appointments — PolicyFynder' }

// RLS scopes which appointments are returned; this page just renders.
export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>
}) {
  const { status, view } = await searchParams
  const active = status && isAppointmentStatus(status) ? status : undefined
  const all = view === 'all'

  const appointments = await listAppointments({
    status: active,
    upcomingOnly: !all && !active,
  })

  const chip = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        isActive
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
    </Link>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          {appointments.length} appointment{appointments.length === 1 ? '' : 's'}
          {!all && !active ? ' (upcoming)' : ''} in your view.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip('/dashboard/appointments', 'Upcoming', !all && !active)}
        {chip('/dashboard/appointments?view=all', 'All', all)}
        {APPOINTMENT_STATUSES.map((s) =>
          chip(`/dashboard/appointments?status=${s}`, appointmentStatusLabel(s), active === s)
        )}
      </div>

      <AppointmentList appointments={appointments} />
    </div>
  )
}
