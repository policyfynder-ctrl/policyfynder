# Final Production Checklist — PolicyFynder v1.0.0

**Date:** 2026-06-27 · **Version:** 1.0.0 · **DB migration:** `20260625000027`
**Build:** PASS · **Lint:** PASS · **Typecheck:** PASS · **Audit (`production:check`):** READY (0 fail, 4 warn)

Legend: ✅ verified in repo · ⏳ operational (human action, not yet done) · ⚠️ attention

---

## Phase 3 — Production Deployment Review

| Item | Status | Notes |
| --- | --- | --- |
| Build configuration | ✅ | `next build` PASS, 46 static/SSG pages |
| Security headers | ✅ | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy; `X-Powered-By` off |
| Image configuration | ✅ | `images.remotePatterns` configured (empty; local/text assets only) |
| Health endpoint | ✅ | `/api/health` (`?db=1` shallow ping) |
| Cron configuration | ✅ | `vercel.json` → `/api/cron/dispatch` `*/2 * * * *` (needs paid plan for sub-daily) |
| Vercel configuration | ⏳ | Create project; connect repo; framework auto-detected |
| Production environment variables | ⏳ | Set in Vercel (see Operational Readiness) |
| Supabase project configuration | ⏳ | Production project; apply 27 migrations; bootstrap admin |
| Auth redirect URLs | ⏳ | Add prod domain + `/auth/callback` in Supabase Auth settings |
| Domain configuration | ⏳ | Point custom domain in Vercel |
| SSL readiness | ⏳ | Auto via Vercel once domain attached (HSTS already set) |

## Phase 4 — Operational Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Environment variables complete | ⏳ | Core trio present locally; prod needs `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, provider keys (when live) |
| Database migration current | ✅ | 027 on local + cloud; `appInfo` matches newest file |
| Communications remain DRY-RUN | ✅ | `COMMUNICATIONS_DRY_RUN` not `false` ⇒ no live sends |
| Production audit passes | ✅ | `npm run production:check` → 0 failed |
| Health endpoint operational | ✅ | returns `status: ok` (+ `db: ok`) |
| Backup / PITR configured | ⏳ | Enable in Supabase; run a test restore (`docs/production/backup-recovery.md`) |
| Monitoring plan documented | ✅ | `docs/production/monitoring.md` (uptime on `/api/health`) |
| Key rotation plan documented | ✅ | `docs/production/key-rotation.md` |
| Disaster recovery documented | ✅ | `docs/production/backup-recovery.md` |

## Phase 5 — Production Smoke-Test Plan (run post-deploy; do NOT run against prod until live)

> Execute on staging or immediately after the production deploy with a disposable test
> record, then clean up. Each must pass.

1. [ ] **Landing page** — `/` renders; CTAs present; partners section + note visible
2. [ ] **Booking flow** — `/book` shows slots (no branch shown); "Book Free Consultation" submits
3. [ ] **Lead creation** — booking creates a lead (source captured)
4. [ ] **RM assignment** — appointment has an RM assigned automatically
5. [ ] **Appointment management** — staff can view/confirm/reschedule/cancel
6. [ ] **Policy creation** — staff create a policy linked to the customer
7. [ ] **Customer Portal** — customer logs in; sees only their own policies/appointments
8. [ ] **Reports** — dashboards return scoped data
9. [ ] **Renewals** — policies due within window appear; reminders generate (queue-only)
10. [ ] **Communications** — compose → queue (DRY-RUN); consent enforced; nothing sent
11. [ ] **Permissions** — RM cannot see out-of-scope data; customer cannot list leads
12. [ ] **SEO** — `/sitemap.xml`, `/robots.txt`, per-page metadata, JSON-LD present
13. [ ] **Performance** — Lighthouse/CWV on landing + a product page (LCP/CLS/INP)
14. [ ] **Accessibility** — keyboard nav, focus states, alt text, headings, `prefers-reduced-motion`

## Remaining manual launch actions (human — not automated)

- [ ] Rotate `service_role` key → update Vercel + `.env.local` ([key-rotation.md](docs/production/key-rotation.md))
- [ ] Rotate DB password → update any `--db-url`
- [ ] Configure Vercel production env vars
- [ ] Create prod Supabase project + apply 27 migrations + bootstrap admin
- [ ] Enable Supabase backups/PITR + test restore
- [ ] Attach domain + verify SSL; update Auth redirect URLs
- [ ] Set uptime monitoring on `/api/health`
- [ ] Keep `COMMUNICATIONS_DRY_RUN=true` until provider go-live is approved

## Go / No-Go

- **Code & configuration:** ✅ **GO** — all automated gates + the full local e2e simulation pass.
- **Production launch:** ⏳ **CONDITIONAL GO** — pending the operational actions above. None are
  code changes; all are deliberate human steps.

- Approver: __________  Date: __________  Decision: **GO / NO-GO**
