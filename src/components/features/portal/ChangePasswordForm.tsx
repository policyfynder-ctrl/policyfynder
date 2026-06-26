'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/features/auth/FormField'
import { FormError } from '@/components/features/auth/FormBanner'

type State = { error?: string; fieldErrors?: Record<string, string> } | undefined

// Reuses the existing updatePassword server action (applies to the in-session user).
export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(updatePassword, undefined)

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField label="New password" name="password" type="password" error={state?.fieldErrors?.password} />
      <FormField
        label="Confirm new password"
        name="confirm_password"
        type="password"
        error={state?.fieldErrors?.confirm_password}
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Change password'}
      </Button>
    </form>
  )
}
