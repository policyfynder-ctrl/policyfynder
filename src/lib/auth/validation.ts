// Shared validation helpers and form-state types for the auth flows.
// Kept dependency-free (no zod) — the rules are simple and run on the server
// inside each server action, so there is no client/server schema drift.

export const MIN_PASSWORD_LENGTH = 8

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value)
}

/** Per-field error messages, keyed by the input's `name`. */
export type FieldErrors = Record<string, string>

/**
 * The state returned by every auth server action and consumed by `useActionState`.
 * - `fieldErrors` → render inline under the matching input
 * - `error`       → form-level failure (e.g. wrong password)
 * - `success`     → form-level confirmation (e.g. "check your email")
 */
export type AuthFormState =
  | {
      error?: string
      fieldErrors?: FieldErrors
      success?: string
    }
  | undefined

/** Reads a form field as a trimmed string (never null/undefined). */
export function field(formData: FormData, name: string, { trim = true } = {}): string {
  const raw = formData.get(name)
  const value = typeof raw === 'string' ? raw : ''
  return trim ? value.trim() : value
}

/** Validates a password and its confirmation; returns field errors (may be empty). */
export function validatePassword(password: string, confirm?: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!password) {
    errors.password = 'Password is required'
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (confirm !== undefined && password !== confirm) {
    errors.confirm_password = 'Passwords do not match'
  }
  return errors
}
