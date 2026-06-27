# PolicyFynder — Launch Report

**Generated:** 2026-06-27
**Branch:** `milestone-15`  ·  **Base commit:** `7794843` (M15 changes pending commit)
**Version:** `1.0.0`  ·  **DB migration:** `20260625000027` (27 migrations)
**Mode:** Communications **DRY-RUN** (no live email/WhatsApp/SMS)

This report is the pre-launch evidence archive for Milestone 15. Regenerate it (and
re-run the checks below) immediately before going live.

---

## Quality gates

| Gate | Result |
| --- | --- |
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS |
| `npm run build` | ✅ PASS (46 static/SSG pages) |
| `npm run production:check` | ✅ 0 failed, 4 warnings (expected pre-launch) |

`production:check` warnings (all expected before production env is configured):
`COMMUNICATIONS_DRY_RUN` on, `CRON_SECRET` not set (cron closed), `NEXT_PUBLIC_SITE_URL` not set.

## Environment validation
- Core Supabase vars present (validated by `src/lib/env.ts`).
- Provider/cron secrets not required in dry-run (correctly optional).

## Security
- Headers verified on a running server: `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` — all present.
- `X-Powered-By` disabled.
- `.env*` gitignored; service-role key server-only.
- CSP deferred (post-launch) — see [docs/production/security.md](docs/production/security.md).

## Health
- `GET /api/health` → `{ status: "ok", version: "1.0.0", migration: "20260625000027" }`
- `GET /api/health?db=1` → `db: "ok"`

## End-to-end production simulation (local, 13/13)
Full flow validated against the local stack (no production data touched):

1. ✅ Landing page renders
2. ✅ Book free consultation (public `/api/book`, branch hidden)
3. ✅ Lead created from booking
4. ✅ RM auto-assigned to appointment
5. ✅ RM login
6. ✅ RM converts lead
7. ✅ RM creates policy
8. ✅ Customer portal shows own policy
9. ✅ RM queues communication (dry-run, consent enforced)
10. ✅ Reports return data
11. ✅ Renewals: policy appears in window
12. ✅ Permissions: customer can't list leads; unrelated RM can't see lead/policy

Re-run: `node scripts/e2e-prod-sim.mjs` (with local `SUPABASE_URL/ANON_KEY/SERVICE_KEY/BASE_URL`).

## Readiness checklists
- [Production index](docs/production/README.md)
- [Deployment](docs/production/deployment.md) · [Security](docs/production/security.md) ·
  [Key rotation](docs/production/key-rotation.md) · [Backup & recovery](docs/production/backup-recovery.md) ·
  [Monitoring](docs/production/monitoring.md) · [Launch checklist](docs/production/launch-checklist.md)

## Known issues / outstanding (operational — human action required)
1. **Rotate exposed secrets** — the cloud `service_role` key + DB password were shared in
   chat during development. Rotate before launch ([key-rotation.md](docs/production/key-rotation.md)).
2. **Production config** — create the Vercel project + production Supabase project; set env vars
   (`NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, etc.); apply 27 migrations.
3. **Backups** — enable Supabase PITR + run a test restore.
4. **Monitoring** — point an uptime monitor at `/api/health`.
5. **Live providers** — keep dry-run until Microsoft Graph / WhatsApp are configured + approved.
6. Deferred (post-launch, non-blocking): CSP tuning, Sentry, log aggregation, performance analytics.

## Go / No-Go
- **Application code & configuration: GO** — all automated gates and the full e2e simulation pass.
- **Production launch: CONDITIONAL GO** — pending the operational items above (key rotation,
  production env, backups, monitoring). None are code changes; all are deliberate human steps.

- Approver: __________  Date: __________  Decision: GO / NO-GO
