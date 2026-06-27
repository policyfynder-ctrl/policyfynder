import Link from 'next/link'
import { redirect } from 'next/navigation'
import { listRenewals, type RenewalWindow } from '@/services/policies'
import { getCurrentViewer } from '@/services/roles'
import { RenewalList } from '@/components/features/renewals/RenewalList'
import { GenerateRemindersButton } from '@/components/features/renewals/GenerateRemindersButton'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Renewals — PolicyFynder' }

const WINDOWS: { value: RenewalWindow; label: string }[] = [
  { value: '30', label: 'Next 30 days' },
  { value: '60', label: 'Next 60 days' },
  { value: '90', label: 'Next 90 days' },
  { value: 'overdue', label: 'Overdue' },
]

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const viewer = await getCurrentViewer()
  const perms = viewer?.permissions ?? []
  // RMs/managers with policy visibility can use the pipeline (RLS scopes the rows).
  if (!perms.some((p) => p.startsWith('policies.view_')) && !perms.includes('renewals.manage')) {
    redirect('/dashboard')
  }
  const canManage = perms.includes('renewals.manage')

  const { window: w } = await searchParams
  const active: RenewalWindow = (['30', '60', '90', 'overdue'] as const).includes(w as RenewalWindow)
    ? (w as RenewalWindow)
    : '30'
  const renewals = await listRenewals(active)

  const chip = (value: RenewalWindow, label: string) => (
    <Link
      href={`/dashboard/renewals?window=${value}`}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active === value
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
    </Link>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Renewals</h1>
          <p className="text-muted-foreground text-sm">
            {renewals.length} polic{renewals.length === 1 ? 'y' : 'ies'} due to renew in your view.
          </p>
        </div>
        {canManage && <GenerateRemindersButton daysAhead={active === 'overdue' ? 30 : Number(active)} />}
      </div>

      <div className="flex flex-wrap gap-2">{WINDOWS.map((o) => chip(o.value, o.label))}</div>

      <RenewalList renewals={renewals} />
    </div>
  )
}
