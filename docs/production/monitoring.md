# Monitoring & Logging

Lightweight, launch-ready observability. Advanced tooling (Sentry, log aggregation,
performance analytics) is **deferred** — see "Later" below.

## At launch

- [ ] **Uptime**: point an external monitor (e.g. an uptime checker) at
      `GET /api/health` (expect 200 `{ status: "ok" }`). Use `?db=1` on a slower
      cadence for a shallow DB check.
- [ ] **Vercel logs**: confirm function/runtime logs are accessible; know where to look
      for API route + server-action errors.
- [ ] **Supabase logs**: confirm access to Postgres logs, Auth logs, and API logs in the
      dashboard for incident triage.
- [ ] **Cron**: confirm `/api/cron/dispatch` runs on schedule (Vercel cron logs); each run
      returns a JSON summary (`claimed/sent/failed`). Dry-run until providers approved.
- [ ] **Build identity**: the in-app production banner (dashboard footer) shows version /
      commit / DB migration so support can confirm what's deployed.

## What to watch

- API route 5xx rate; auth failures; booking failures (`/api/book`).
- Communication queue: rows stuck in `pending`/`failed` (dispatcher health) via the
  Communications screen + `delivery_logs`.
- Health endpoint `status: "degraded"` (DB ping failing).

## Alerting (minimum)

- [ ] Uptime monitor alerts on health-check failure.
- [ ] A channel (email/Slack) for Vercel deployment-failure notifications.

## Later (deferred this milestone)

- Error tracking (Sentry) with source maps + release tagging.
- Centralized log aggregation / retention.
- Web-vitals / performance analytics dashboards.
- Synthetic transaction monitoring of the booking funnel.
