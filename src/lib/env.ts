// Centralized environment access + validation (Milestone 15).
//
// Goals:
//  - Single source of truth for which env vars exist and which are required.
//  - Fail FAST with a clear, aggregated message when a required var is missing,
//    instead of a cryptic runtime error deep in a Supabase call.
//  - Stay safe for the Next.js build / static generation: validation runs on demand
//    (server clients, /api/health, production:check) — never at module top-level in
//    code that the client bundle imports.
//
// "Required" is contextual: the Supabase trio is always required; provider/cron
// secrets are required only when live sending is enabled (COMMUNICATIONS_DRY_RUN
// is explicitly 'false'). In dry-run (the default) they are optional.

export const REQUIRED_CORE = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

// Required ONLY when COMMUNICATIONS_DRY_RUN === 'false' (live sending).
export const REQUIRED_WHEN_LIVE = [
  'CRON_SECRET',
  'GRAPH_TENANT_ID',
  'GRAPH_CLIENT_ID',
  'GRAPH_CLIENT_SECRET',
  'GRAPH_SENDER',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_VERIFY_TOKEN',
] as const

export function isDryRun(): boolean {
  return process.env.COMMUNICATIONS_DRY_RUN !== 'false'
}

export type EnvReport = {
  ok: boolean
  dryRun: boolean
  missing: string[] // required-but-absent
  warnings: string[] // non-fatal (e.g. optional-but-recommended for prod)
}

/** Validate the environment for the current mode. Pure — never throws. */
export function validateEnv(): EnvReport {
  const dryRun = isDryRun()
  const missing: string[] = []
  const warnings: string[] = []

  for (const key of REQUIRED_CORE) {
    if (!process.env[key]) missing.push(key)
  }

  if (!dryRun) {
    for (const key of REQUIRED_WHEN_LIVE) {
      if (!process.env[key]) missing.push(key)
    }
  } else {
    // In dry-run, a missing CRON_SECRET means the dispatch cron route is closed —
    // expected pre-launch, but worth flagging.
    if (!process.env.CRON_SECRET) warnings.push('CRON_SECRET is not set (cron dispatch is disabled).')
  }

  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL) {
    warnings.push('NEXT_PUBLIC_SITE_URL is not set (sitemap/OG/canonical fall back to the default domain).')
  }

  return { ok: missing.length === 0, dryRun, missing, warnings }
}

/**
 * Assert the environment is valid or throw an aggregated error. Call from server
 * entry points (Supabase clients) so misconfiguration surfaces immediately and
 * legibly. Safe to call at runtime; do not call at import-time in client code.
 */
export function assertEnv(): void {
  const { ok, missing } = validateEnv()
  if (!ok) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        `See .env.local.example and docs/production/deployment.md.`
    )
  }
}

/** Typed, validated accessor for the always-required core vars. */
export const env = {
  get supabaseUrl(): string {
    return required('NEXT_PUBLIC_SUPABASE_URL')
  },
  get supabaseAnonKey(): string {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  get supabaseServiceRoleKey(): string {
    return required('SUPABASE_SERVICE_ROLE_KEY')
  },
  get siteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://policyfynder.com'
  },
}

function required(key: string): string {
  const v = process.env[key]
  if (!v) {
    throw new Error(`Missing required environment variable: ${key}. See .env.local.example.`)
  }
  return v
}
