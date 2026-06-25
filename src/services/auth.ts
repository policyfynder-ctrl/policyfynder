'use server'

// Authentication server actions. Server-first: forms POST directly to these via
// `useActionState`, so credentials never live in client state and validation runs
// server-side. Each action returns an `AuthFormState` for inline error/success
// rendering, or calls `redirect()` on success (which throws and never returns).

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  type AuthFormState,
  field,
  isValidEmail,
  validatePassword,
  type FieldErrors,
} from '@/lib/auth/validation'

// Absolute origin for building email redirect links (confirmation, reset).
async function siteOrigin(): Promise<string> {
  const h = await headers()
  return h.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, 'email')
  const password = field(formData, 'password', { trim: false })

  const fieldErrors: FieldErrors = {}
  if (!email) fieldErrors.email = 'Email is required'
  else if (!isValidEmail(email)) fieldErrors.email = 'Enter a valid email address'
  if (!password) fieldErrors.password = 'Password is required'
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  // Generic message — never reveal whether the email exists.
  if (error) return { error: 'Invalid email or password. Please try again.' }

  redirect('/dashboard')
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = field(formData, 'full_name')
  const email = field(formData, 'email')
  const password = field(formData, 'password', { trim: false })
  const confirm = field(formData, 'confirm_password', { trim: false })

  const fieldErrors: FieldErrors = {}
  if (!fullName) fieldErrors.full_name = 'Your name is required'
  if (!email) fieldErrors.email = 'Email is required'
  else if (!isValidEmail(email)) fieldErrors.email = 'Enter a valid email address'
  Object.assign(fieldErrors, validatePassword(password, confirm))
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const origin = await siteOrigin()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  })

  if (error) return { error: error.message }

  // When email confirmation is enabled, no session is returned yet.
  if (!data.session) {
    return {
      success: 'Account created. Check your email for a confirmation link, then sign in.',
    }
  }

  redirect('/dashboard')
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = field(formData, 'email')
  if (!email || !isValidEmail(email)) {
    return { fieldErrors: { email: 'Enter a valid email address' } }
  }

  const origin = await siteOrigin()
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  // Always report success — don't leak whether the email is registered.
  return {
    success: 'If an account exists for that email, a password reset link is on its way.',
  }
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = field(formData, 'password', { trim: false })
  const confirm = field(formData, 'confirm_password', { trim: false })

  const fieldErrors = validatePassword(password, confirm)
  if (Object.keys(fieldErrors).length) return { fieldErrors }

  const supabase = await createClient()

  // The reset link established a session via /auth/callback; updateUser applies
  // to that authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: 'Your reset link has expired. Request a new password reset email below.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
