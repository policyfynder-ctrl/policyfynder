import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { RenewalsReport } from '@/services/reports'

function Cell({ label, value, danger }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={'mt-0.5 text-xl font-semibold tabular-nums ' + (danger ? 'text-destructive' : '')}>
        {value}
      </p>
    </div>
  )
}

export function RenewalsSummary({ r }: { r: RenewalsReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Renewals pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Cell label="Due ≤30d" value={r.due_30} />
          <Cell label="Due ≤60d" value={r.due_60} />
          <Cell label="Due ≤90d" value={r.due_90} />
          <Cell label="Overdue" value={r.overdue} danger={r.overdue > 0} />
          <Cell label="Completed MTD" value={r.completed_mtd} />
          <Cell label="Renewal rate" value={`${r.renewal_rate}%`} />
        </div>
      </CardContent>
    </Card>
  )
}
