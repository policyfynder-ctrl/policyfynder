import Link from 'next/link'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { SignupForm } from '@/components/features/auth/SignupForm'

export const metadata = { title: 'Create account — PolicyFynder' }

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start managing leads and policies with PolicyFynder"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  )
}
