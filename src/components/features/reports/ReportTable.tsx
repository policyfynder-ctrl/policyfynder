import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// Dumb table: the page formats each row into cells, so this stays type-agnostic.
export function ReportTable({
  title,
  headers,
  rows,
  empty = 'No data.',
  rightAlignFrom,
}: {
  title: string
  headers: string[]
  rows: React.ReactNode[][]
  empty?: string
  rightAlignFrom?: number // column index from which cells are right-aligned (numbers)
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  {headers.map((h, i) => (
                    <th
                      key={h}
                      className={
                        'py-2 pr-4 font-medium ' +
                        (rightAlignFrom !== undefined && i >= rightAlignFrom ? 'text-right' : '')
                      }
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((cells, ri) => (
                  <tr key={ri} className="border-border border-t">
                    {cells.map((c, ci) => (
                      <td
                        key={ci}
                        className={
                          'py-2 pr-4 ' +
                          (rightAlignFrom !== undefined && ci >= rightAlignFrom
                            ? 'text-right tabular-nums'
                            : '')
                        }
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
