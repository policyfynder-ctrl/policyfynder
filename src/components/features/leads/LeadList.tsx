import Link from 'next/link'
import { LeadStatusBadge } from './LeadStatusBadge'
import type { LeadListRow } from '@/services/leads'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Server component: renders the RLS-scoped leads as a table. Each row links to the
// detail page.
export function LeadList({ leads }: { leads: LeadListRow[] }) {
  if (leads.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-4 py-10 text-center text-sm">
        No leads to show. Leads booked through the public booking page will appear here.
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
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Assigned RM</th>
            <th className="hidden px-4 py-2 font-medium md:table-cell">Branch</th>
            <th className="hidden px-4 py-2 font-medium lg:table-cell">Source</th>
            <th className="px-4 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-border hover:bg-muted/30 border-t">
              <td className="px-4 py-2.5">
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="text-foreground font-medium hover:underline"
                >
                  {lead.first_name} {lead.last_name}
                </Link>
                <div className="text-muted-foreground text-xs">{lead.email}</div>
              </td>
              <td className="px-4 py-2.5">
                <LeadStatusBadge status={lead.status} />
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">
                {lead.assigned_rm?.profile?.full_name ?? '—'}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">
                {lead.branch?.name ?? '—'}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 lg:table-cell">
                {lead.source?.name ?? '—'}
              </td>
              <td className="text-muted-foreground px-4 py-2.5">{formatDate(lead.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
