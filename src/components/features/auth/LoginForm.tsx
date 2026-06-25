'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { login } from '@/services/auth'
import { FormField } from './FormField'
import { FormError } from './FormBanner'
import { SubmitButton } from './SubmitButton'

export function LoginForm() {
  const [state, action] = useActionState(login, undefined)

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state?.error} />

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
        autoComplete="current-password"
        placeholder="••••••••"
        error={state?.fieldErrors?.password}
        required
        labelAccessory={
          <Link
            href="/reset-password"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Forgot password?
          </Link>
        }
      />

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  )
}
