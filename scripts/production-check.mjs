// Production readiness audit (Milestone 15). One-command pre-launch sanity check.
//
//   npm run production:check
//
// Read-only and side-effect free: it inspects config, env, and (optionally) pings
// Supabase + the health endpoint. It NEVER rotates keys, deploys, changes Supabase
// settings, enables live sending, or modifies data. Exit code 1 if any FAIL.
//
// Optional env to widen the audit:
//   PRODUCTION_CHECK_URL   base URL to ping /api/health (e.g. https://policyfynder.com)

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let fails = 0
let warns = 0
const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`)
const warn = (m) => {
  warns++
  console.log(`  \x1b[33mWARN\x1b[0m  ${m}`)
}
const fail = (m) => {
  fails++
  console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`)
}
const section = (t) => console.log(`\n${t}`)

// --- load .env.local into a map (does not override real process.env) ---
function loadEnv() {
  const env = { ...process.env }
  const p = join(root, '.env.local')
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const s = line.trim()
      if (!s || s.startsWith('#') || !s.includes('=')) continue
      const i = s.indexOf('=')
      const k = s.slice(0, i).trim()
      const v = s.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      if (env[k] === undefined) env[k] = v
    }
  }
  return env
}
const env = loadEnv()
const isDryRun = env.COMMUNICATIONS_DRY_RUN !== 'false'

const REQUIRED_CORE = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
const REQUIRED_WHEN_LIVE = [
  'CRON_SECRET', 'GRAPH_TENANT_ID', 'GRAPH_CLIENT_ID', 'GRAPH_CLIENT_SECRET', 'GRAPH_SENDER',
  'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN',
]

console.log('\n=== PolicyFynder — Production Readiness Check ===')

// 1) Environment variables
section('1. Environment variables')
for (const k of REQUIRED_CORE) { if (env[k]) pass(`${k} set`); else fail(`${k} missing (required)`) }
if (isDryRun) {
  warn('COMMUNICATIONS_DRY_RUN is on (dry-run) — provider/cron secrets optional; NO live messages will send.')
  if (!env.CRON_SECRET) warn('CRON_SECRET not set — /api/cron/dispatch is closed (expected pre-launch).')
} else {
  for (const k of REQUIRED_WHEN_LIVE) { if (env[k]) pass(`${k} set`); else fail(`${k} missing (required for live sending)`) }
}
if (env.NEXT_PUBLIC_SITE_URL) pass(`NEXT_PUBLIC_SITE_URL = ${env.NEXT_PUBLIC_SITE_URL}`)
else warn('NEXT_PUBLIC_SITE_URL not set — sitemap/OG/canonical use the default domain.')

// 2) Version + migration consistency
section('2. Build identity consistency')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
let appInfo = ''
try { appInfo = readFileSync(join(root, 'src/lib/appInfo.ts'), 'utf8') } catch {}
const appVersion = (appInfo.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1]
const appMig = (appInfo.match(/LATEST_DB_MIGRATION\s*=\s*'([^']+)'/) || [])[1]
if (appVersion === pkg.version) pass(`APP_VERSION (${appVersion}) matches package.json (${pkg.version})`)
else fail(`APP_VERSION (${appVersion}) != package.json version (${pkg.version})`)

const migDir = join(root, 'supabase/migrations')
const migFiles = existsSync(migDir) ? readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort() : []
const latestMig = migFiles.length ? migFiles[migFiles.length - 1].replace('.sql', '') : ''
if (appMig && latestMig.startsWith(appMig)) pass(`LATEST_DB_MIGRATION (${appMig}) matches newest migration file`)
else fail(`LATEST_DB_MIGRATION (${appMig}) != newest migration (${latestMig})`)
pass(`${migFiles.length} migration files on disk`)

// 3) Vercel + cron config
section('3. Vercel / cron configuration')
const vercelPath = join(root, 'vercel.json')
if (existsSync(vercelPath)) {
  const vercel = JSON.parse(readFileSync(vercelPath, 'utf8'))
  pass('vercel.json present')
  const cron = (vercel.crons || []).find((c) => c.path === '/api/cron/dispatch')
  if (cron) pass(`cron configured: ${cron.path} @ "${cron.schedule}"`)
  else warn('no /api/cron/dispatch cron in vercel.json')
} else fail('vercel.json missing')

// 4) Security config sanity (static)
section('4. Security configuration')
const nextCfg = readFileSync(join(root, 'next.config.ts'), 'utf8')
for (const h of ['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  if (nextCfg.includes(h)) pass(`header configured: ${h}`)
  else fail(`security header missing: ${h}`)
}
if (nextCfg.includes('poweredByHeader: false')) pass('X-Powered-By disabled')
else warn('poweredByHeader not disabled')
const gi = readFileSync(join(root, '.gitignore'), 'utf8')
if (gi.includes('.env*')) pass('.env* is gitignored')
else fail('.env* not gitignored — secret leak risk')

// 5) Supabase connectivity (read-only REST ping)
section('5. Supabase connectivity (read-only)')
if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  try {
    // Any HTTP response (even 401/404) means the host is reachable; only a thrown
    // network error indicates Supabase is unreachable. A 5xx is a real problem.
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    })
    if (res.status >= 500) fail(`Supabase REST returned HTTP ${res.status}`)
    else pass(`Supabase REST reachable (HTTP ${res.status})`)
  } catch (e) {
    fail(`Supabase unreachable: ${e.message}`)
  }
} else warn('skipped — Supabase URL/anon key not set')

// 6) Health endpoint (optional)
section('6. Health endpoint')
if (env.PRODUCTION_CHECK_URL) {
  try {
    const res = await fetch(`${env.PRODUCTION_CHECK_URL.replace(/\/$/, '')}/api/health`)
    const j = await res.json().catch(() => ({}))
    if (res.ok && j.status === 'ok') pass(`/api/health ok (v${j.version}, migration ${j.migration})`)
    else fail(`/api/health unhealthy (HTTP ${res.status}, status=${j.status})`)
  } catch (e) {
    fail(`/api/health unreachable: ${e.message}`)
  }
} else warn('skipped — set PRODUCTION_CHECK_URL to ping a running deployment.')

// Summary
section('=== Summary ===')
console.log(`  ${fails === 0 ? '\x1b[32m' : '\x1b[31m'}${fails} failed\x1b[0m, \x1b[33m${warns} warnings\x1b[0m`)
console.log(`  Mode: ${isDryRun ? 'DRY-RUN (no live sending)' : 'LIVE'}`)
console.log(fails === 0 ? '  Result: READY (review warnings)\n' : '  Result: NOT READY — resolve failures above\n')
process.exit(fails === 0 ? 0 : 1)
