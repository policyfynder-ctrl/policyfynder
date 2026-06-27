import { Badge } from '@/components/ui/badge'
import type { MessageRow } from '@/services/communications'

function label(s: string | null): string {
  return (s ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function statusVariant(s: string): 'default' | 'secondary' | 'muted' | 'outline' {
  if (s === 'delivered' || s === 'read') return 'default'
  if (s === 'failed') return 'muted'
  if (s === 'pending') return 'secondary'
  return 'outline'
}

// The communication queue log — RLS-scoped. Queue-only: most rows sit at 'pending'.
export function MessageQueueList({ messages }: { messages: MessageRow[] }) {
  if (messages.length === 0) {
    return <p className="text-muted-foreground text-sm">No messages in the queue.</p>
  }
  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-4 py-2 font-medium">Policy</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium">Channel</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Queued</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((m) => (
            <tr key={m.id} className="border-border border-t">
              <td className="px-4 py-2.5">{m.policy?.policy_number ?? '—'}</td>
              <td className="px-4 py-2.5">{label(m.category)}</td>
              <td className="px-4 py-2.5">{label(m.channel)}</td>
              <td className="px-4 py-2.5">
                <Badge variant={statusVariant(m.status)}>{label(m.status)}</Badge>
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">
                {new Date(m.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
