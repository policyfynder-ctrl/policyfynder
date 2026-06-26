import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLead } from '@/services/leads'
import { hasPermission } from '@/services/roles'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LeadStatusBadge } from '@/components/features/leads/LeadStatusBadge'
import { LeadStatusForm } from '@/components/features/leads/LeadStatusForm'

export const metadata = { title: 'Lead — PolicyFynder' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
function fmtTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [lead, canUpdate] = await Promise.all([getLead(id), hasPermission('leads', 'update')])
  if (!lead) notFound() // not found, or outside the viewer's RLS scope

  const rmName = lead.assigned_rm?.profile?.full_name ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/leads" className="text-muted-foreground text-sm hover:underline">
          ← Back to leads
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {lead.first_name} {lead.last_name}
          </h1>
          <LeadStatusBadge status={lead.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              {lead.email}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {lead.phone}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p>
              <span className="text-muted-foreground">Source: </span>
              {lead.source?.name ?? '—'}
              {lead.source_campaign ? ` (${lead.source_campaign})` : ''}
            </p>
            <p>
              <span className="text-muted-foreground">Branch: </span>
              {lead.branch?.name ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Assigned RM: </span>
              {rmName ?? 'Unassigned'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-muted-foreground">Interests:</span>
              {lead.insurance_interest.length === 0 ? (
                <span>—</span>
              ) : (
                lead.insurance_interest.map((i) => (
                  <Badge key={i} variant="muted">
                    {i}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
            <CardDescription>Status changes are recorded in the activity log.</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadStatusForm leadId={lead.id} current={lead.status} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appointment history</CardTitle>
        </CardHeader>
        <CardContent>
          {lead.appointments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No appointments yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lead.appointments
                .slice()
                .sort((a, b) =>
                  `${a.appointment_date}${a.start_time}` < `${b.appointment_date}${b.start_time}`
                    ? 1
                    : -1
                )
                .map((a) => (
                  <li
                    key={a.id}
                    className="border-border flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span>
                      {fmtDate(a.appointment_date)} · {fmtTime(a.start_time)}–{fmtTime(a.end_time)}
                    </span>
                    <Badge variant="outline">{a.status}</Badge>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
