'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { MessageRow } from '@/services/communications'

function label(s: string | null): string {
  return (s ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function statusVariant(s: string): 'default' | 'secondary' | 'muted' | 'outline' {
  if (s === 'delivered' || s === 'read') return 'default'
  if (s === 'failed') return 'muted'
  if (s === 'pending') return 'secondary'
  return 'outline' // sent
}

// The communication queue log — RLS-scoped. Rows expand to show the per-attempt
// delivery_logs trail written by the dispatcher / webhook (M13). Dispatch is
// dry-run by default, so a 'sent' status with a dryrun-* provider id is expected.
export function MessageQueueList({ messages }: { messages: MessageRow[] }) {
  const [open, setOpen] = useState<string | null>(null)

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
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Attempts</th>
            <th className="hidden px-4 py-2 font-medium md:table-cell">Queued</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {messages.map((m) => {
            const isOpen = open === m.id
            const hasTrail = m.delivery_logs.length > 0 || !!m.error_message
            return (
              <FragmentRow
                key={m.id}
                m={m}
                isOpen={isOpen}
                hasTrail={hasTrail}
                onToggle={() => setOpen(isOpen ? null : m.id)}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FragmentRow({
  m,
  isOpen,
  hasTrail,
  onToggle,
}: {
  m: MessageRow
  isOpen: boolean
  hasTrail: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr className="border-border border-t">
        <td className="px-4 py-2.5">{m.policy?.policy_number ?? '—'}</td>
        <td className="px-4 py-2.5">{label(m.category)}</td>
        <td className="px-4 py-2.5">{label(m.channel)}</td>
        <td className="px-4 py-2.5">
          <Badge variant={statusVariant(m.status)}>{label(m.status)}</Badge>
        </td>
        <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">
          {m.retry_count}/{m.max_retries}
        </td>
        <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">
          {new Date(m.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-2.5 text-right">
          {hasTrail && (
            <button
              type="button"
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              {isOpen ? 'Hide' : 'Details'}
            </button>
          )}
        </td>
      </tr>
      {isOpen && hasTrail && (
        <tr className="border-border bg-muted/30 border-t">
          <td colSpan={7} className="px-4 py-3">
            <dl className="text-muted-foreground grid gap-1 text-xs">
              {m.provider_message_id && (
                <div className="flex gap-2">
                  <dt className="font-medium">Provider ID:</dt>
                  <dd className="font-mono">{m.provider_message_id}</dd>
                </div>
              )}
              {m.sent_at && (
                <div className="flex gap-2">
                  <dt className="font-medium">Sent:</dt>
                  <dd>{new Date(m.sent_at).toLocaleString()}</dd>
                </div>
              )}
              {m.error_message && (
                <div className="flex gap-2">
                  <dt className="font-medium">Last error:</dt>
                  <dd className="text-foreground">{m.error_message}</dd>
                </div>
              )}
            </dl>
            {m.delivery_logs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {m.delivery_logs.map((d, i) => (
                  <li key={i} className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span className="text-foreground tabular-nums">#{d.attempt}</span>
                    <Badge variant={statusVariant(d.status)}>{label(d.status)}</Badge>
                    <span>{new Date(d.created_at).toLocaleString()}</span>
                    {d.detail && <span className="font-mono">{d.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
