import Link from 'next/link'
import { listMyRenewals } from '@/services/portal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/policies'

export const metadata = { title: 'My Renewals — PolicyFynder' }

function renewalState(renewalDate: string | null, completedAt: string | null): { label: string; variant: 'default' | 'secondary' | 'muted' | 'outline' } {
  if (completedAt) return { label: 'Completed', variant: 'muted' }
  if (renewalDate && renewalDate < new Date().toISOString().slice(0, 10)) return { label: 'Overdue', variant: 'default' }
  return { label: 'Upcoming', variant: 'secondary' }
}

export default async function MyRenewalsPage() {
  const renewals = await listMyRenewals()
  const upcoming = renewals.filter((r) => !r.renewal_completed_at)
  const history = renewals.filter((r) => r.renewal_completed_at)

  const table = (rows: typeof renewals, empty: string) =>
    rows.length === 0 ? (
      <p className="text-muted-foreground text-sm">{empty}</p>
    ) : (
      <ul className="divide-border divide-y">
        {rows.map((r) => {
          const st = renewalState(r.renewal_date, r.renewal_completed_at)
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link href={`/dashboard/my-policies/${r.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="font-medium">{r.policy_number}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {r.insurer?.name ?? '—'} ·{' '}
                  {r.renewal_completed_at ? `renewed ${formatDate(r.renewal_completed_at)}` : `renews ${formatDate(r.renewal_date)}`}
                </span>
              </Link>
              <Badge variant={st.variant}>{st.label}</Badge>
            </li>
          )
        })}
      </ul>
    )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My Renewals</h1>
        <p className="text-muted-foreground text-sm">Track your upcoming and completed policy renewals.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming renewals</CardTitle>
        </CardHeader>
        <CardContent>{table(upcoming, 'No upcoming renewals.')}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Renewal history</CardTitle>
        </CardHeader>
        <CardContent>{table(history, 'No completed renewals yet.')}</CardContent>
      </Card>
    </div>
  )
}
