import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { PolicyStatusBadge } from '@/components/features/policies/PolicyStatusBadge'
import { AppointmentStatusBadge } from '@/components/features/appointments/AppointmentStatusBadge'
import { formatDate } from '@/lib/policies'
import type { CustomerDashboard as Data } from '@/services/portal'

function fmtWhen(d: string, t: string) {
  return new Date(`${d}T${t}`).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CustomerDashboard({ data, name }: { data: Data; name: string | null }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Welcome{name ? `, ${name}` : ''}</h1>
        <p className="text-muted-foreground text-sm">Your policies, renewals, and appointments.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs">Active policies</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{data.activePolicies}</p>
            <Link href="/dashboard/my-policies" className="text-muted-foreground mt-1 inline-block text-xs hover:underline">
              View all policies →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Relationship Manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.rm ? (
              <>
                <p className="font-medium">{data.rm.rm_name ?? '—'}</p>
                {data.rm.email && <p className="text-muted-foreground">{data.rm.email}</p>}
                {data.rm.phone && <p className="text-muted-foreground">{data.rm.phone}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">No relationship manager assigned yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Upcoming renewals</CardTitle>
          <Link href="/dashboard/my-renewals" className="text-muted-foreground text-xs hover:underline">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {data.upcomingRenewals.length === 0 ? (
            <p className="text-muted-foreground text-sm">No renewals due in the next 90 days.</p>
          ) : (
            <ul className="divide-border divide-y">
              {data.upcomingRenewals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/dashboard/my-policies/${r.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="font-medium">{r.policy_number}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {r.insurer?.name ?? '—'} · renews {formatDate(r.renewal_date)}
                    </span>
                  </Link>
                  <PolicyStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming appointments</CardTitle>
            <Link href="/dashboard/my-appointments" className="text-muted-foreground text-xs hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingAppointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming appointments.</p>
            ) : (
              <ul className="divide-border divide-y">
                {data.upcomingAppointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{fmtWhen(a.appointment_date, a.start_time)}</span>
                      <span className="text-muted-foreground block truncate text-xs">{a.branch?.name ?? ''}</span>
                    </span>
                    <AppointmentStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent notifications</CardTitle>
            <Link href="/dashboard/notifications" className="text-muted-foreground text-xs hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentNotifications.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notifications.</p>
            ) : (
              <ul className="divide-border divide-y">
                {data.recentNotifications.map((n) => (
                  <li key={n.id} className="py-2 text-sm">
                    <span className="font-medium">{n.type.replace(/_/g, ' ')}</span>
                    <CardDescription className="text-xs">{formatDate(n.created_at)}</CardDescription>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
