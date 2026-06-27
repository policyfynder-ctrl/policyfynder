'use client'

import { useState } from 'react'
import { deletePolicyAction } from '@/app/dashboard/policies/actions'
import { Button } from '@/components/ui/button'

// Soft-delete control. Asks for confirmation, then posts to the server action
// (RLS enforces permission; the DB trigger logs policy.deleted).
export function DeletePolicyButton({ policyId }: { policyId: string }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Delete policy
      </Button>
    )
  }

  return (
    <form action={deletePolicyAction} className="flex items-center gap-2">
      <input type="hidden" name="policy_id" value={policyId} />
      <span className="text-muted-foreground text-sm">Soft-delete this policy?</span>
      <Button type="submit" variant="destructive" size="sm">
        Confirm
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  )
}
