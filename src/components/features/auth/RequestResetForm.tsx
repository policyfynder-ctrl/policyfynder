'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/services/auth'
import { FormField } from './FormField'
import { FormError, FormSuccess } from './FormBanner'
import { SubmitButton } from './SubmitButton'

// Step 1 of password reset: request a reset email.
export function RequestResetForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined)

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={state?.fieldErrors?.email}
        required
      />

      <SubmitButton className="w-full" pendingLabel="Sending link…">
        Send reset link
      </SubmitButton>
    </form>
  )
}
