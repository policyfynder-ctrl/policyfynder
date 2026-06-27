import { redirect } from 'next/navigation'
import { getCurrentViewer } from '@/services/roles'
import {
  getOverview,
  getRenewalsReport,
  getLeadFunnel,
  getLeadSources,
  getLeadsMonthly,
  getAppointmentStats,
  getPolicyStatus,
  getPolicyByInsurer,
  getPolicyByProduct,
  getRmPerformance,
  getTeamPerformance,
  getBranchPerformance,
} from '@/services/reports'
import { KpiTiles } from '@/components/features/reports/KpiTiles'
import { DistributionBars } from '@/components/features/reports/DistributionBars'
import { ReportTable } from '@/components/features/reports/ReportTable'
import { RenewalsSummary } from '@/components/features/reports/RenewalsSummary'
import { formatMoney } from '@/lib/policies'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Reports — PolicyFynder' }

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
const isDate = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((100 * n) / d)}%` : '—'
}
function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}
function humanise(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const ctrl =
  'border-border bg-background h-9 rounded-lg border px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const viewer = await getCurrentViewer()
  const perms = viewer?.permissions ?? []
  if (!perms.some((p) => p.startsWith('reports.view_'))) redirect('/dashboard')

  const canViewBranch = perms.includes('reports.view_branch') || perms.includes('reports.view_all')
  const canViewTeam = canViewBranch || perms.includes('reports.view_team')

  const sp = await searchParams
  const from = isDate(sp.from) ? sp.from : isoDaysAgo(90)
  const to = isDate(sp.to) ? sp.to : todayISO()

  const [
    overview,
    renewals,
    funnel,
    sources,
    monthly,
    appts,
    polStatus,
    byInsurer,
    byProduct,
    rmPerf,
    teamPerf,
    branchPerf,
  ] = await Promise.all([
    getOverview(),
    getRenewalsReport(),
    getLeadFunnel(from, to),
    getLeadSources(from, to),
    getLeadsMonthly(6),
    getAppointmentStats(from, to),
    getPolicyStatus(),
    getPolicyByInsurer(),
    getPolicyByProduct(),
    getRmPerformance(),
    canViewTeam ? getTeamPerformance() : Promise.resolve([]),
    canViewBranch ? getBranchPerformance() : Promise.resolve([]),
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm">Scoped to the data you can access.</p>
        </div>
        <form method="get" className="flex items-end gap-2">
          <label className="text-muted-foreground space-y-1 text-xs">
            From
            <input type="date" name="from" defaultValue={from} className={ctrl + ' block'} />
          </label>
          <label className="text-muted-foreground space-y-1 text-xs">
            To
            <input type="date" name="to" defaultValue={to} className={ctrl + ' block'} />
          </label>
          <Button type="submit" size="sm" variant="secondary">
            Apply
          </Button>
        </form>
      </div>

      {/* Overview KPIs */}
      {overview && <KpiTiles o={overview} />}

      {/* Leads */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Leads ({from} → {to})</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <DistributionBars title="Lead funnel" rows={funnel} />
          <ReportTable
            title="Lead sources"
            headers={['Source', 'Total', 'Converted', 'Conv %']}
            rightAlignFrom={1}
            rows={sources.map((s) => [humanise(s.source), s.total, s.converted, pct(s.converted, s.total)])}
            empty="No leads in range."
          />
        </div>
        <ReportTable
          title="Monthly leads (last 6 months)"
          headers={['Month', 'New leads', 'Converted']}
          rightAlignFrom={1}
          rows={monthly.map((m) => [monthLabel(m.month), m.total, m.converted])}
        />
      </section>

      {/* Appointments */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Appointments ({from} → {to})</h2>
        <DistributionBars title="Appointment status" rows={appts} />
      </section>

      {/* Policies */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Policies</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <DistributionBars title="Policy status" rows={polStatus} />
          <ReportTable
            title="By insurer"
            headers={['Insurer', 'Policies', 'Premium (ref)']}
            rightAlignFrom={1}
            rows={byInsurer.map((b) => [b.name, b.count, formatMoney(b.premium_cents)])}
          />
          <ReportTable
            title="By product"
            headers={['Product', 'Policies', 'Premium (ref)']}
            rightAlignFrom={1}
            rows={byProduct.map((b) => [b.name, b.count, formatMoney(b.premium_cents)])}
          />
        </div>
      </section>

      {/* Renewals */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Renewals</h2>
        {renewals && <RenewalsSummary r={renewals} />}
      </section>

      {/* Performance scorecards */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Performance</h2>
        {canViewBranch && (
          <ReportTable
            title="Branch performance"
            headers={['Branch', 'RMs', 'Leads', 'Won', 'Appts', 'Active pol.', 'Renewals MTD', 'Premium (ref)']}
            rightAlignFrom={1}
            rows={branchPerf.map((b) => [
              b.branch_name, b.rm_count, b.leads_total, b.leads_converted,
              b.appts_completed, b.active_policies, b.renewals_completed_mtd, formatMoney(b.premium_cents),
            ])}
          />
        )}
        {canViewTeam && (
          <ReportTable
            title="Team performance"
            headers={['Team', 'Branch', 'Members', 'Leads', 'Won', 'Appts', 'Active pol.', 'Renewals MTD', 'Open tasks']}
            rightAlignFrom={2}
            rows={teamPerf.map((t) => [
              t.team_name, t.branch_name, t.member_count, t.leads_total, t.leads_converted,
              t.appts_completed, t.active_policies, t.renewals_completed_mtd, t.tasks_open,
            ])}
          />
        )}
        <ReportTable
          title="RM performance"
          headers={['RM', 'Leads', 'Won', 'Appts done', 'Active pol.', 'Renewals MTD', 'Open tasks', 'Overdue']}
          rightAlignFrom={1}
          rows={rmPerf.map((r) => [
            r.rm_name ?? 'Unnamed RM', r.leads_total, r.leads_converted, r.appts_completed,
            r.active_policies, r.renewals_completed_mtd, r.tasks_open, r.tasks_overdue,
          ])}
          empty="No RMs in your scope."
        />
      </section>
    </div>
  )
}
