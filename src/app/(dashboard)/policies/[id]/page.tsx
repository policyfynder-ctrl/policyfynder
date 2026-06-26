import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPolicy, getPolicyActivity, listAssignableRms } from '@/services/policies'
import { hasPermission } from '@/services/roles'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { PolicyStatusBadge } from '@/components/features/policies/PolicyStatusBadge'
import { PolicyEditForm } from '@/components/features/policies/PolicyEditForm'
import { DeletePolicyButton } from '@/components/features/policies/DeletePolicyButton'
import { formatMoney, formatDate } from '@/lib/policies'

export const metadata = { title: 'Policy — PolicyFynder' }

function centsToMajor(cents: number | null): string {
  return cents == null ? '' : String(cents / 100)
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  )
}

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [policy, canUpdate, canDelete, canAssign] = await Promise.all([
    getPolicy(id),
    hasPermission('policies', 'update'),
    hasPermission('policies', 'delete'),
    hasPermission('policies', 'assign'),
  ])
  if (!policy) notFound() // not found, or outside the viewer's RLS scope

  const [activity, assignableRms] = await Promise.all([
    getPolicyActivity(id),
    canUpdate ? listAssignableRms() : Promise.resolve([]),
  ])

  const rmName = policy.assigned_rm?.profile?.full_name ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/policies" className="text-muted-foreground text-sm hover:underline">
          ← Back to policies
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{policy.policy_number}</h1>
          <PolicyStatusBadge status={policy.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Name" value={policy.holder_name} />
            <Row label="Phone" value={policy.holder_phone ?? '—'} />
            <Row label="Email" value={policy.holder_email ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Insurer" value={policy.insurer?.name ?? '—'} />
            <Row label="Product" value={policy.product?.name ?? '—'} />
            <Row label="Policy type" value={policy.policy_type ?? '—'} />
            <Row label="Premium (reference)" value={formatMoney(policy.premium_cents)} />
            <Row label="Sum assured" value={formatMoney(policy.sum_assured_cents)} />
            <Row label="Issue date" value={formatDate(policy.issue_date)} />
            <Row label="Start date" value={formatDate(policy.start_date)} />
            <Row label="Expiry date" value={formatDate(policy.expiry_date)} />
            <Row label="Renewal date" value={formatDate(policy.renewal_date)} />
            <Row label="Renewal completed" value={formatDate(policy.renewal_completed_at)} />
            <Row label="Last contacted" value={formatDate(policy.last_contacted_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Relationship Manager" value={rmName ?? 'Unassigned'} />
            <Row label="Branch" value={policy.branch?.name ?? '—'} />
            <Row label="Team" value={policy.assigned_rm?.team?.name ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row
              label="Original lead"
              value={
                policy.lead ? (
                  <Link href={`/dashboard/leads/${policy.lead.id}`} className="hover:underline">
                    {policy.lead.first_name} {policy.lead.last_name}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <Row
              label="Appointment"
              value={
                policy.appointment ? (
                  <Link
                    href={`/dashboard/appointments/${policy.appointment.id}`}
                    className="hover:underline"
                  >
                    {formatDate(policy.appointment.appointment_date)}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      {canUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>Edit policy</CardTitle>
            <CardDescription>Changes are recorded in the activity log.</CardDescription>
          </CardHeader>
          <CardContent>
            <PolicyEditForm
              policyId={policy.id}
              status={policy.status}
              premiumMajor={centsToMajor(policy.premium_cents)}
              sumAssuredMajor={centsToMajor(policy.sum_assured_cents)}
              expiryDate={policy.expiry_date ?? ''}
              renewalDate={policy.renewal_date ?? ''}
              renewalCompletedDate={policy.renewal_completed_at ?? ''}
              lastContactedDate={policy.last_contacted_at ?? ''}
              assignedRmId={policy.assigned_rm_id ?? ''}
              assignableRms={assignableRms}
              canAssign={canAssign}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="border-border flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="font-medium">{a.action}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canDelete && (
        <div className="flex justify-end">
          <DeletePolicyButton policyId={policy.id} />
        </div>
      )}
    </div>
  )
}
