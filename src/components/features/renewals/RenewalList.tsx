import Link from 'next/link'
import { formatDate } from '@/lib/policies'
import { buttonVariants } from '@/components/ui/button'
import {
  logContactAction,
  markRenewedAction,
  createRenewalTaskAction,
} from '@/app/dashboard/renewals/actions'
import type { RenewalRow } from '@/services/policies'

const actBtn = buttonVariants({ size: 'sm', variant: 'outline' }) + ' h-7 px-2 text-xs'

// Server component: renewal pipeline. Each row exposes the three follow-up actions
// (log contact, create task, mark renewed) as progressive-enhancement forms.
export function RenewalList({ renewals }: { renewals: RenewalRow[] }) {
  if (renewals.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-4 py-10 text-center text-sm">
        No policies match this renewal window.
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
            <th className="px-4 py-2 font-medium">Renewal</th>
            <th className="hidden px-4 py-2 font-medium lg:table-cell">Last contacted</th>
            <th className="hidden px-4 py-2 font-medium lg:table-cell">RM</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {renewals.map((r) => (
            <tr key={r.id} className="border-border hover:bg-muted/30 border-t align-top">
              <td className="px-4 py-2.5">
                <Link
                  href={`/dashboard/policies/${r.id}`}
                  className="text-foreground font-medium hover:underline"
                >
                  {r.policy_number}
                </Link>
              </td>
              <td className="px-4 py-2.5">{r.holder_name}</td>
              <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">
                {r.insurer?.name ?? '—'}
              </td>
              <td className="px-4 py-2.5">{formatDate(r.renewal_date)}</td>
              <td className="text-muted-foreground hidden px-4 py-2.5 lg:table-cell">
                {formatDate(r.last_contacted_at)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 lg:table-cell">
                {r.assigned_rm?.profile?.full_name ?? '—'}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <form action={logContactAction}>
                    <input type="hidden" name="policy_id" value={r.id} />
                    <button type="submit" className={actBtn}>
                      Log contact
                    </button>
                  </form>
                  <form action={createRenewalTaskAction}>
                    <input type="hidden" name="policy_id" value={r.id} />
                    <input type="hidden" name="assigned_rm_id" value={r.assigned_rm?.id ?? ''} />
                    <input type="hidden" name="policy_number" value={r.policy_number} />
                    <input type="hidden" name="renewal_date" value={r.renewal_date ?? ''} />
                    <button type="submit" className={actBtn}>
                      Create task
                    </button>
                  </form>
                  <form action={markRenewedAction}>
                    <input type="hidden" name="policy_id" value={r.id} />
                    <button type="submit" className={actBtn}>
                      Mark renewed
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
