import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { CountRow } from '@/services/reports'

// Horizontal count bars for a small set of categories (lead funnel, policy status,
// appointment status). Labels are humanised (snake_case → Title Case).
function humanise(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DistributionBars({ title, rows }: { title: string; rows: CountRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data in range.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.label} className="text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span>{humanise(r.label)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {r.count}
                    {total > 0 && <span className="ml-1">({Math.round((100 * r.count) / total)}%)</span>}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${(100 * r.count) / max}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
