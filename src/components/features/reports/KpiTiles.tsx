import { Card, CardContent } from '@/components/ui/card'
import { formatMoney } from '@/lib/policies'
import type { Overview } from '@/services/reports'

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

// Overview KPI tiles. premium / won value are reference figures.
export function KpiTiles({ o }: { o: Overview }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Tile label="Leads" value={String(o.leads_total)} hint={`${o.leads_converted} converted`} />
      <Tile label="Conversion rate" value={`${o.conversion_pct}%`} />
      <Tile label="Appointments done" value={String(o.appts_completed)} hint={`${o.no_show_pct}% no-show`} />
      <Tile label="Active policies" value={String(o.active_policies)} />
      <Tile label="Renewals due (30d)" value={String(o.renewals_due_30)} hint={`${o.renewals_completed_mtd} done MTD`} />
      <Tile label="Premium under mgmt" value={formatMoney(o.premium_under_mgmt_cents)} hint="reference" />
    </div>
  )
}
