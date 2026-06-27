'use client'

import { useActionState } from 'react'
import { updatePolicyAction, type PolicyActionState } from '@/app/dashboard/policies/actions'
import { POLICY_STATUSES, policyStatusLabel } from '@/lib/policies'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import type { PolicyStatus } from '@/types'

type Props = {
  policyId: string
  status: PolicyStatus
  premiumMajor: string
  sumAssuredMajor: string
  expiryDate: string
  renewalDate: string
  renewalCompletedDate: string
  lastContactedDate: string
  assignedRmId: string
  assignableRms: { id: string; name: string }[]
  canAssign: boolean
}

const selectCls =
  'border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-3 text-sm focus-visible:ring-3 focus-visible:outline-none'

// Edit the permitted fields (premium, sum assured, expiry, renewal, frequency,
// status, assigned RM). RLS enforces whether the caller may update on the server.
export function PolicyEditForm(props: Props) {
  const [state, action, pending] = useActionState<PolicyActionState, FormData>(
    updatePolicyAction,
    undefined
  )

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="policy_id" value={props.policyId} />
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Premium (₹)</span>
          <input name="premium" type="number" min="0" step="0.01" defaultValue={props.premiumMajor} className={selectCls} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Sum assured (₹)</span>
          <input name="sum_assured" type="number" min="0" step="0.01" defaultValue={props.sumAssuredMajor} className={selectCls} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Expiry date</span>
          <input name="expiry_date" type="date" defaultValue={props.expiryDate} className={selectCls} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Renewal date</span>
          <input name="renewal_date" type="date" defaultValue={props.renewalDate} className={selectCls} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Renewal completed on</span>
          <input
            name="renewal_completed_at"
            type="date"
            defaultValue={props.renewalCompletedDate}
            className={selectCls}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Last contacted on</span>
          <input
            name="last_contacted_at"
            type="date"
            defaultValue={props.lastContactedDate}
            className={selectCls}
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Status</span>
          <select name="status" defaultValue={props.status} className={selectCls}>
            {POLICY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {policyStatusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        {props.canAssign && (
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Assigned RM</span>
            <select name="assigned_rm_id" defaultValue={props.assignedRmId} className={selectCls}>
              <option value="">Unassigned</option>
              {props.assignableRms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {!props.canAssign && <input type="hidden" name="assigned_rm_id" value={props.assignedRmId} />}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
