import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMyPolicy, getMyPolicyHistory } from '@/services/portal'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { PolicyStatusBadge } from '@/components/features/policies/PolicyStatusBadge'
import { formatMoney, formatDate } from '@/lib/policies'

export const metadata = { title: 'Policy — PolicyFynder' }

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  )
}

export default async function MyPolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const policy = await getMyPolicy(id)
  if (!policy) notFound() // not found, or not the customer's (RLS)
  const history = await getMyPolicyHistory(id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/my-policies" className="text-muted-foreground text-sm hover:underline">
          ← Back to my policies
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{policy.policy_number}</h1>
          <PolicyStatusBadge status={policy.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Insurer" value={policy.insurer?.name ?? '—'} />
            <Row label="Product" value={policy.product?.name ?? '—'} />
            <Row label="Type" value={policy.policy_type ?? '—'} />
            <Row label="Premium" value={formatMoney(policy.premium_cents)} />
            <Row label="Sum assured" value={formatMoney(policy.sum_assured_cents)} />
            <Row label="Issue date" value={formatDate(policy.issue_date)} />
            <Row label="Start date" value={formatDate(policy.start_date)} />
            <Row label="Expiry date" value={formatDate(policy.expiry_date)} />
            <Row label="Renewal date" value={formatDate(policy.renewal_date)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policyholder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Name" value={policy.holder_name} />
            <Row label="Email" value={policy.holder_email ?? '—'} />
            <Row label="Phone" value={policy.holder_phone ?? '—'} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">No history yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="border-border flex items-center justify-between rounded-md border px-3 py-2">
                  <span>{h.action.replace(/_/g, ' ').replace('.', ' · ')}</span>
                  <span className="text-muted-foreground text-xs">{formatDate(h.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Your policy documents will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No documents available yet.</p>
        </CardContent>
      </Card>
    </div>
  )
}
