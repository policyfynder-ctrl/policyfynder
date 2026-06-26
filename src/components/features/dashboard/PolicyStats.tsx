import Link from 'next/link'
import { getPolicyDashboard } from '@/services/policies'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PolicyStatusBadge } from '@/components/features/policies/PolicyStatusBadge'
import { formatDate } from '@/lib/policies'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}

// Dashboard policy widgets — all RLS-scoped to the viewer via getPolicyDashboard.
export async function PolicyStats() {
  const d = await getPolicyDashboard()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Policies</h2>
        <Link href="/dashboard/policies" className="text-muted-foreground text-xs hover:underline">
          View all →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active policies" value={String(d.active)} hint="Currently in force" />
        <Stat
          label="Expiring policies"
          value={String(d.expiring)}
          hint="Cover ends in the next 30 days"
        />
        <Stat
          label="Renewals due"
          value={String(d.renewalsDue)}
          hint="Due to renew in the next 30 days"
        />
        <Stat
          label="Renewals completed"
          value={String(d.renewalsCompleted)}
          hint="Actioned this month"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently added policies</CardTitle>
        </CardHeader>
        <CardContent>
          {d.recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No policies yet.</p>
          ) : (
            <ul className="divide-border divide-y">
              {d.recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/dashboard/policies/${p.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="font-medium">{p.policy_number}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {p.holder_name} · {p.insurer?.name ?? '—'} · {formatDate(p.created_at)}
                    </span>
                  </Link>
                  <PolicyStatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
