'use client'

import { useActionState } from 'react'
import { updateLeadStatusAction, type StatusActionState } from '@/app/(dashboard)/leads/actions'
import { LEAD_STATUSES, leadStatusLabel } from '@/lib/leads'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import type { LeadStatus } from '@/types'

// Status updater. Only rendered when the viewer has leads.update (UX gate); RLS is
// the real enforcement on the server action.
export function LeadStatusForm({ leadId, current }: { leadId: string; current: LeadStatus }) {
  const [state, action, pending] = useActionState<StatusActionState, FormData>(
    updateLeadStatusAction,
    undefined
  )

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <div className="flex items-center gap-2">
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={current}
          className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border px-3 text-sm focus-visible:ring-3 focus-visible:outline-none"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {leadStatusLabel(s)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Update status'}
        </Button>
      </div>
    </form>
  )
}
