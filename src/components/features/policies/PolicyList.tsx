import Link from 'next/link'
import { PolicyStatusBadge } from './PolicyStatusBadge'
import { formatMoney, formatDate } from '@/lib/policies'
import type { PolicyListRow } from '@/services/policies'

// Server component: renders RLS-scoped policies as a table. Each row links to detail.
export function PolicyList({ policies }: { policies: PolicyListRow[] }) {
  if (policies.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-4 py-10 text-center text-sm">
        No policies match your view.
      </p>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-4 py-2 font-medium">Policy #</th>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="hidden px-4 py-2 font-medium md:table-cell">Insurer</th>
            <th className="hidden px-4 py-2 font-medium lg:table-cell">Product</th>
            <th className="px-4 py-2 font-medium">Premium</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Expiry</th>
            <th className="hidden px-4 py-2 font-medium lg:table-cell">Assigned RM</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id} className="border-border hover:bg-muted/30 border-t">
              <td className="px-4 py-2.5">
                <Link
                  href={`/dashboard/policies/${p.id}`}
                  className="text-foreground font-medium hover:underline"
                >
                  {p.policy_number}
                </Link>
              </td>
              <td className="px-4 py-2.5">{p.holder_name}</td>
              <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">
                {p.insurer?.name ?? '—'}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 lg:table-cell">
                {p.product?.name ?? '—'}
              </td>
              <td className="px-4 py-2.5">{formatMoney(p.premium_cents)}</td>
              <td className="px-4 py-2.5">
                <PolicyStatusBadge status={p.status} />
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">
                {formatDate(p.expiry_date)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 lg:table-cell">
                {p.assigned_rm?.profile?.full_name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
