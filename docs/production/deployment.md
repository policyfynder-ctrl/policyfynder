# Deployment — Vercel + Supabase

End-to-end deployment of PolicyFynder. The app deploys on **Vercel**; the database
is a **Supabase** project. Use a **separate Supabase project** for production (do not
share with dev).

> Nothing here is automated. Run `npm run production:check` before and after.

## 1. Supabase (production project)

- [ ] Create a new Supabase project; note Project Ref, Project URL, anon key, service_role key.
- [ ] Apply all migrations in order (currently **27**, latest `20260625000027`):
  ```bash
  supabase db push --db-url "postgresql://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres"
  ```
  (Password must be URL-encoded: `@`→`%40`, `#`→`%23`, `%`→`%25`.)
- [ ] Verify migration count matches the repo (`supabase migration list`).
- [ ] Auth → URL Configuration: add the production site URL + `/(auth)/callback` redirect.
- [ ] Auth → Providers → Email: confirm confirmation/redirect settings for production.
- [ ] Bootstrap the first admin — see [../admin-bootstrap.md](../admin-bootstrap.md).

## 2. Vercel project

- [ ] Connect the GitHub repo; framework auto-detected (Next.js).
- [ ] Set **Environment Variables** (Production scope):

  | Var | Required | Notes |
  | --- | --- | --- |
  | `NEXT_PUBLIC_SUPABASE_URL` | ✅ | production project URL |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon key |
  | `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **secret** — server only, never `NEXT_PUBLIC_` |
  | `NEXT_PUBLIC_SITE_URL` | ✅ | e.g. `https://policyfynder.com` (SEO/OG/canonical) |
  | `NEXT_PUBLIC_COMMIT_SHA` | optional | set to `$VERCEL_GIT_COMMIT_SHA` for the prod banner |
  | `COMMUNICATIONS_DRY_RUN` | ✅ | keep `true` until live providers are approved |
  | `CRON_SECRET` | when sending | bearer for `/api/cron/dispatch` |
  | `GRAPH_*`, `WHATSAPP_*` | when sending | see [../communication-providers.md](../communication-providers.md) |

- [ ] Confirm `vercel.json` cron (`/api/cron/dispatch`, `*/2 * * * *`) — sub-daily cron needs a paid plan.
- [ ] Deploy; confirm the build passes and the production URL resolves.
- [ ] Point the custom domain; enforce HTTPS.

## 3. Post-deploy verification

- [ ] `PRODUCTION_CHECK_URL=https://<domain> npm run production:check` → 0 failures.
- [ ] `GET /api/health` → `{ status: "ok", ... }`; `?db=1` → `db: "ok"`.
- [ ] Landing renders; `/dashboard` redirects to `/login` when signed out.
- [ ] One real booking creates a lead + appointment (then clean up the test row).
- [ ] Run the [launch-checklist.md](./launch-checklist.md).

## Rollback

- Vercel: promote the previous deployment (instant) from the Deployments tab.
- Database: migrations are additive; if a release must be reverted, redeploy the
  prior app build (schema generally stays). For destructive schema issues, restore
  from backup — see [backup-recovery.md](./backup-recovery.md).
