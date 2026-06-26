import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRm } from '@/services/rms'
import { hasPermission } from '@/services/roles'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RmActiveToggle } from '@/components/features/rms/RmActiveToggle'
import { RmScheduleEditor } from '@/components/features/rms/RmScheduleEditor'
import { dayLabel, fmtTime } from '@/lib/rms'

export const metadata = { title: 'Relationship Manager — PolicyFynder' }

export default async function RmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [rm, canManage] = await Promise.all([getRm(id), hasPermission('rms', 'manage_branch')])
  if (!rm) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/rms" className="text-muted-foreground text-sm hover:underline">
          ← Back to RMs
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {rm.profile?.full_name ?? 'Unnamed RM'}
          </h1>
          <Badge variant={rm.is_active ? 'secondary' : 'muted'}>
            {rm.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p>
              <span className="text-muted-foreground">Employee ID: </span>
              {rm.employee_id ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Branch: </span>
              {rm.branch?.name ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Team: </span>
              {rm.team?.name ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Max daily appointments: </span>
              {rm.max_daily_appointments}
            </p>
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Deactivating removes the RM from booking capacity.</CardDescription>
            </CardHeader>
            <CardContent>
              <RmActiveToggle rmId={rm.id} isActive={rm.is_active} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
          <CardDescription>Drives booking availability for this RM.</CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <RmScheduleEditor rmId={rm.id} schedules={rm.schedules} />
          ) : rm.schedules.length === 0 ? (
            <p className="text-muted-foreground text-sm">No weekly hours set.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {rm.schedules.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{dayLabel(s.day_of_week)}</span>{' '}
                  {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
