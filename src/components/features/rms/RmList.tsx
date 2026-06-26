import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { RmRow } from '@/services/rms'

export function RmList({ rms }: { rms: RmRow[] }) {
  if (rms.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-4 py-10 text-center text-sm">
        No relationship managers in your view yet.
      </p>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Branch</th>
            <th className="hidden px-4 py-2 font-medium md:table-cell">Team</th>
            <th className="px-4 py-2 font-medium">Daily cap</th>
          </tr>
        </thead>
        <tbody>
          {rms.map((rm) => (
            <tr key={rm.id} className="border-border hover:bg-muted/30 border-t">
              <td className="px-4 py-2.5">
                <Link
                  href={`/dashboard/rms/${rm.id}`}
                  className="text-foreground font-medium hover:underline"
                >
                  {rm.profile?.full_name ?? 'Unnamed RM'}
                </Link>
                {rm.employee_id && (
                  <div className="text-muted-foreground text-xs">{rm.employee_id}</div>
                )}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={rm.is_active ? 'secondary' : 'muted'}>
                  {rm.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">
                {rm.branch?.name ?? '—'}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">
                {rm.team?.name ?? '—'}
              </td>
              <td className="text-muted-foreground px-4 py-2.5">{rm.max_daily_appointments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
