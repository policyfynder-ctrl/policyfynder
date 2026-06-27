import Link from 'next/link'
import { listPolicies, type ExpiryFilter } from '@/services/policies'
import { listInsurers } from '@/services/insurers'
import { listProducts } from '@/services/products'
import { hasPermission } from '@/services/roles'
import { PolicyList } from '@/components/features/policies/PolicyList'
import { POLICY_STATUSES, policyStatusLabel, isPolicyStatus } from '@/lib/policies'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata = { title: 'Policies — PolicyFynder' }

const EXPIRY_OPTIONS: { value: ExpiryFilter; label: string }[] = [
  { value: 'this_month', label: 'Expiring this month' },
  { value: 'next_30', label: 'Expiring next 30 days' },
  { value: 'expired', label: 'Expired' },
]

const ctrl =
  'border-border bg-background h-9 rounded-lg border px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none'

// Policy list. RLS scopes which policies return; this page only renders + filters.
export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const status = sp.status && isPolicyStatus(sp.status) ? sp.status : undefined
  const expiry = (['this_month', 'next_30', 'expired'] as const).includes(sp.expiry as ExpiryFilter)
    ? (sp.expiry as ExpiryFilter)
    : undefined
  const page = Math.max(1, Number(sp.page) || 1)

  const [{ rows, total, pageSize }, insurers, products, canCreate] = await Promise.all([
    listPolicies({
      search: sp.q,
      status,
      insurerId: sp.insurer || undefined,
      productId: sp.product || undefined,
      expiry,
      page,
    }),
    listInsurers(),
    listProducts(),
    hasPermission('policies', 'create'),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.q) params.set('q', sp.q)
    if (status) params.set('status', status)
    if (sp.insurer) params.set('insurer', sp.insurer)
    if (sp.product) params.set('product', sp.product)
    if (expiry) params.set('expiry', expiry)
    params.set('page', String(p))
    return `/dashboard/policies?${params.toString()}`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Policies</h1>
          <p className="text-muted-foreground text-sm">
            {total} polic{total === 1 ? 'y' : 'ies'} in your view.
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/policies/new" className={buttonVariants({ size: 'sm' })}>
            New policy
          </Link>
        )}
      </div>

      {/* Server-first filter bar: GET submit re-renders with query params. */}
      <form method="get" className="flex flex-wrap items-end gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search number or customer…"
          className={ctrl + ' min-w-48 flex-1'}
        />
        <select name="status" defaultValue={status ?? ''} className={ctrl}>
          <option value="">All statuses</option>
          {POLICY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {policyStatusLabel(s)}
            </option>
          ))}
        </select>
        <select name="insurer" defaultValue={sp.insurer ?? ''} className={ctrl}>
          <option value="">All insurers</option>
          {insurers.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <select name="product" defaultValue={sp.product ?? ''} className={ctrl}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select name="expiry" defaultValue={expiry ?? ''} className={ctrl}>
          <option value="">Any expiry</option>
          {EXPIRY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Apply
        </Button>
        <Link
          href="/dashboard/policies"
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          Reset
        </Link>
      </form>

      <PolicyList policies={rows} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
