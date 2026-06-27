# PolicyFynder v1.0.0 — Release Notes

**Date:** 2026-06-27 · **DB migration:** `20260625000027` · **Status:** Release Candidate (pending operational launch steps)

PolicyFynder is an insurance brokerage CRM + public website: it helps customers find,
compare, and manage insurance with a dedicated relationship manager, and gives staff a
full back office from lead to renewal. v1.0 is the result of Milestones 1–15.

---

## Milestones 1–15

| # | Milestone | Highlights |
| --- | --- | --- |
| 1 | Foundation & schema | 27-migration schema, enums, triggers, capacity model |
| 2 | Authentication | Supabase Auth, server-first flows, password reset |
| 3 | Dashboard shell | Role-aware sidebar via `get_user_permissions` |
| 4 | Public booking | `/book` flow, least-busy RM assignment |
| 5 | Lead management | Pipeline, status history, RLS scoping |
| 6 | Appointment management | Status lifecycle, reschedule, capacity guard |
| 7 | RM & team management | Branch/team scoping, least-privilege staff directory |
| 8 | Policy management | Policies + insurers, lifecycle (no payment gateway) |
| 9 | Renewals & reminders | Generic tasks, `generate_renewal_reminders()`, queue-only |
| 10 | Reports & analytics | 12 scoped SECURITY DEFINER reporting functions |
| 11 | Customer portal | Self-service; fixed 2 pre-existing security holes |
| 12 | Communication foundation | Templates, consent, delivery logs (queue-only) |
| 13 | Live communication providers | Graph/WhatsApp adapters, dispatcher, webhooks (dry-run) |
| 14 | Public website | Marketing site, 6 product pages, partners, SEO |
| 15 | Production readiness | Env validation, security headers, health, audit, docs |

## Major features
- **Public website**: landing, 6 insurance product pages (health/motor/life/travel/commercial/group),
  About/Contact/Claims/Knowledge/Privacy/Terms, "Our Insurance Partners", SEO (sitemap, robots, JSON-LD).
  Built on the exact PolicyFynder brand (Trust Blue/navy/teal; Plus Jakarta Sans + Inter).
- **Booking**: public "Book Free Consultation" — branches hidden, branch/RM assigned internally.
- **Back office**: leads, appointments, policies, renewals/tasks, reports, RM/team management.
- **Customer portal**: policies, renewals, appointments (change requests), notifications, preferences.
- **Communications**: single notifications queue, templates with `{{variables}}`, consent enforcement,
  multi-channel dispatcher (email via Microsoft Graph, WhatsApp Cloud API) — **dry-run by default**.
- **Health & ops**: `/api/health`, `npm run production:check`, production banner, launch docs.

## Security improvements
- Table-based RBAC + RLS across all entities; SECURITY DEFINER scope helpers.
- Fixed privilege-escalation (profile self-promote) and direct customer appointment mutation (M11).
- Service-role usage confined to API routes + server services; never client-side.
- Strict communication consent (queue-time trigger + send-time re-check).
- Security headers (HSTS, X-Frame-Options, etc.); `X-Powered-By` disabled.
- Env validation fail-fast; `.env*` gitignored; DB password scrubbed from docs (rotation pending).

## Production readiness
- Quality gates: typecheck / lint / build (46 static/SSG) clean.
- `production:check` one-command audit; full 12-step local e2e simulation (13/13).
- `docs/production/` (deployment, security, key-rotation, backup-recovery, monitoring, launch-checklist).

## Known limitations
- **Communications are dry-run** — no live email/WhatsApp until providers are configured + approved.
- **Partner logos** are text placeholders pending official licensed assets.
- Single-branch internal routing for booking (no geo/multi-branch routing yet).
- CSP not yet enabled (safe headers only); no Sentry / log aggregation / perf analytics yet.
- DB password remains in earlier git history until rotated (mandatory pre-launch).

## Future roadmap (v1.1+)
- Go live with communication providers (Graph + WhatsApp) + template management UI.
- Real partner logos; multi-branch geo-routing; richer analytics.
- CSP tuning, Sentry, log aggregation, performance analytics.
