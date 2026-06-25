'use client'

import { logout } from '@/services/auth'
import { SubmitButton } from './SubmitButton'

// Sign-out control. Posts to the `logout` server action which clears the
// session cookie and redirects to /login.
export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton variant="outline" pendingLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  )
}
