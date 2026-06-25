import Link from 'next/link'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { LoginForm } from '@/components/features/auth/LoginForm'

export const metadata = { title: 'Sign in — PolicyFynder' }

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to PolicyFynder"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-foreground font-medium hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  )
}
