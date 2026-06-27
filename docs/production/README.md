# Production Readiness — PolicyFynder

Master index for taking PolicyFynder to production. Work top-to-bottom; each
document is a focused checklist.

| Doc | Purpose |
| --- | --- |
| [deployment.md](./deployment.md) | Vercel + Supabase deployment steps and env vars |
| [security.md](./security.md) | Supabase/app security checklist before launch |
| [key-rotation.md](./key-rotation.md) | Manual rotation of secrets (service role key, DB password, etc.) |
| [backup-recovery.md](./backup-recovery.md) | Backups, PITR, restore drill, RTO/RPO |
| [monitoring.md](./monitoring.md) | Logging, uptime, error tracking, alerting |
| [launch-checklist.md](./launch-checklist.md) | Final pre-launch QA + Go/No-Go gate |

## One-command audit

```bash
npm run production:check
```

Read-only audit of env vars, build-identity consistency, Vercel/cron config,
security headers, Supabase connectivity, and (optionally) the health endpoint.
Set `PRODUCTION_CHECK_URL=https://<your-domain>` to also ping `/api/health`.

## Current state (keep accurate)

- Stack: Next.js 16 (App Router) + Supabase (Postgres/Auth/RLS) + Tailwind v4.
- Database: **27 migrations** (`supabase/migrations/`), latest `20260625000027`.
- Communications: **dry-run by default** (`COMMUNICATIONS_DRY_RUN` ≠ `false` ⇒ no live sends).
- App version: `1.0.0` (package.json ↔ `src/lib/appInfo.ts`, asserted by `production:check`).
- Health: `GET /api/health` (`?db=1` for a shallow DB ping).

## Guardrails (this milestone)

These are **documented, not automated**. A human performs them deliberately:
key rotation, deployment, Supabase setting changes, enabling live sending, and any
production-data changes.
