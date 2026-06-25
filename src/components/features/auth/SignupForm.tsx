'use client'

import { useActionState } from 'react'
import { signup } from '@/services/auth'
import { FormField } from './FormField'
import { FormError, FormSuccess } from './FormBanner'
import { SubmitButton } from './SubmitButton'

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined)

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />

      <FormField
        label="Full name"
        name="full_name"
        type="text"
        autoComplete="name"
        placeholder="Jane Doe"
        error={state?.fieldErrors?.full_name}
        required
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={state?.fieldErrors?.email}
        required
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={state?.fieldErrors?.password}
        required
      />

      <FormField
        label="Confirm password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        error={state?.fieldErrors?.confirm_password}
        required
      />

      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  )
}
