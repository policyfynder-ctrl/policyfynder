'use client'

import { useActionState } from 'react'
import { toggleRmActiveAction, type RmActionState } from '@/app/dashboard/rms/actions'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'

export function RmActiveToggle({ rmId, isActive }: { rmId: string; isActive: boolean }) {
  const [state, action, pending] = useActionState<RmActionState, FormData>(
    toggleRmActiveAction,
    undefined
  )
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="rm_id" value={rmId} />
      <input type="hidden" name="is_active" value={(!isActive).toString()} />
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <Button
        type="submit"
        size="sm"
        variant={isActive ? 'destructive' : 'default'}
        disabled={pending}
      >
        {pending ? 'Saving…' : isActive ? 'Deactivate RM' : 'Activate RM'}
      </Button>
    </form>
  )
}
