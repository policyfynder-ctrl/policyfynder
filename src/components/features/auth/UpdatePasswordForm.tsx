'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/services/auth'
import { FormField } from './FormField'
import { FormError } from './FormBanner'
import { SubmitButton } from './SubmitButton'

// Step 2 of password reset: set a new password (the reset link already
// established a session via /auth/callback).
export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined)

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state?.error} />

      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={state?.fieldErrors?.password}
        required
      />

      <FormField
        label="Confirm new password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your new password"
        error={state?.fieldErrors?.confirm_password}
        required
      />

      <SubmitButton className="w-full" pendingLabel="Updating…">
        Update password
      </SubmitButton>
    </form>
  )
}
