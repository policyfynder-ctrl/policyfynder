import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { TeamRow } from '@/services/teams'

export function TeamList({ teams }: { teams: TeamRow[] }) {
  if (teams.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-4 py-10 text-center text-sm">
        No teams in your view yet.
      </p>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-4 py-2 font-medium">Team</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Branch</th>
            <th className="hidden px-4 py-2 font-medium md:table-cell">Leader</th>
            <th className="px-4 py-2 font-medium">Members</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id} className="border-border hover:bg-muted/30 border-t">
              <td className="px-4 py-2.5">
                <Link
                  href={`/dashboard/teams/${t.id}`}
                  className="text-foreground font-medium hover:underline"
                >
                  {t.name}
                </Link>
                {!t.is_active && (
                  <Badge variant="muted" className="ml-2">
                    Inactive
                  </Badge>
                )}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">
                {t.branch?.name ?? '—'}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">
                {t.leader?.profile?.full_name ?? '—'}
              </td>
              <td className="text-muted-foreground px-4 py-2.5">
                {t.member_count?.[0]?.count ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
