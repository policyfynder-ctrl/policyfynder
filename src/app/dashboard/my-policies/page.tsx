import Link from 'next/link'
import { listMyPolicies } from '@/services/portal'
import { MyPolicyList } from '@/components/features/portal/MyPolicyList'
import { POLICY_STATUSES, policyStatusLabel, isPolicyStatus } from '@/lib/policies'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'My Policies — PolicyFynder' }

const ctrl =
  'border-border bg-background h-9 rounded-lg border px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none'

export default async function MyPoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const sp = await searchParams
  const status = sp.status && isPolicyStatus(sp.status) ? sp.status : undefined
  const policies = await listMyPolicies({ search: sp.q, status })

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
    </Link>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My Policies</h1>
        <p className="text-muted-foreground text-sm">
          {policies.length} polic{policies.length === 1 ? 'y' : 'ies'}.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Search policy number…" className={ctrl + ' min-w-48 flex-1'} />
        <Button type="submit" size="sm" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {chip('/dashboard/my-policies', 'All', !status)}
        {POLICY_STATUSES.map((s) => chip(`/dashboard/my-policies?status=${s}`, policyStatusLabel(s), status === s))}
      </div>

      <MyPolicyList policies={policies} />
    </div>
  )
}
