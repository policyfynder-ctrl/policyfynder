import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { RequestResetForm } from '@/components/features/auth/RequestResetForm'
import { UpdatePasswordForm } from '@/components/features/auth/UpdatePasswordForm'

export const metadata = { title: 'Reset password — PolicyFynder' }

// This page serves both reset steps:
//  - No session  → user wants a reset link (RequestResetForm)
//  - Has session → user arrived from the reset email via /auth/callback and is
//    setting a new password (UpdatePasswordForm)
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return (
      <AuthCard title="Set a new password" description="Choose a new password for your account.">
        <UpdatePasswordForm />
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset password"
      description="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Back to sign in
        </Link>
      }
    >
      <RequestResetForm />
    </AuthCard>
  )
}
