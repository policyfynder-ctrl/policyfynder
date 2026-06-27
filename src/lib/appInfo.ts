// App identity for the production banner, /api/health, and the production:check audit.
// Keep APP_VERSION in sync with package.json (production:check verifies this) and
// LATEST_DB_MIGRATION in sync with the newest file in supabase/migrations.

export const APP_VERSION = '1.0.0'

// Newest migration filename prefix (supabase/migrations). production:check asserts
// this matches the migrations directory so the banner never drifts from reality.
export const LATEST_DB_MIGRATION = '20260625000027'

/** Short commit SHA, from the build environment (Vercel) or 'local' in dev. */
export function getCommitSha(): string {
  const sha =
    process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  return sha.slice(0, 7)
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
