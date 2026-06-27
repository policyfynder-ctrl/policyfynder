import Link from 'next/link'
import { listLeads } from '@/services/leads'
import { LeadList } from '@/components/features/leads/LeadList'
import { LEAD_STATUSES, leadStatusLabel, isLeadStatus } from '@/lib/leads'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Leads — PolicyFynder' }

// Lead list. RLS scopes which leads are returned (RM=assigned, manager=branch/team,
// super admin=all), so this page contains no role logic — it just renders.
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const active = status && isLeadStatus(status) ? status : undefined
  const leads = await listLeads(active ? { status: active } : undefined)

  const chip = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        isActive
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
    </Link>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
        <p className="text-muted-foreground text-sm">
          {leads.length} lead{leads.length === 1 ? '' : 's'} in your view.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip('/dashboard/leads', 'All', !active)}
        {LEAD_STATUSES.map((s) =>
          chip(`/dashboard/leads?status=${s}`, leadStatusLabel(s), active === s)
        )}
      </div>

      <LeadList leads={leads} />
    </div>
  )
}
