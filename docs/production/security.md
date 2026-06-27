# Security Checklist

Review before launch. Most controls already exist in the codebase — this verifies
them and flags anything operational.

## Secrets

- [ ] `.env*` is gitignored (only `.env.local.example` tracked) — verified by `production:check`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only server-side (never `NEXT_PUBLIC_`); used only in
      API routes + server services (`booking`, `contact`, `dispatch`).
- [ ] **Rotate any secret ever shared in chat/logs** before launch — see [key-rotation.md](./key-rotation.md).
      (Known: the cloud service_role key + DB password were exposed earlier and must be rotated.)
- [ ] Vercel env vars set with Production scope; no secrets in client bundles.

## Database / RLS

- [ ] RLS enabled on all public tables; policies scope by owner/branch/role.
- [ ] `SECURITY DEFINER` helpers (`has_permission`, `get_accessible_*`, `is_admin`, etc.) reviewed.
- [ ] Service-role-only functions stay locked (e.g. `claim_due_notifications` is REVOKEd from
      anon/authenticated, granted to `service_role`).
- [ ] No broad grants; anon can read only what the public site needs (active branches, slots, products).
- [ ] Profile self-update cannot escalate role/email (M11 `protect_profile_columns`).

## Application

- [ ] Security headers present (`next.config.ts`): HSTS, X-Content-Type-Options, X-Frame-Options,
      Referrer-Policy, Permissions-Policy; `X-Powered-By` disabled.
- [ ] CSP: **deferred** — add and test a Content-Security-Policy post-launch.
- [ ] API routes verify session + permission server-side (admin routes) or a shared secret
      (cron) / signature (webhook). Never trust client-sent flags.
- [ ] Webhook (`/api/webhooks/whatsapp`) verifies `X-Hub-Signature-256` (HMAC) before acting.
- [ ] Cron (`/api/cron/dispatch`) refuses without a valid `CRON_SECRET` bearer.
- [ ] Communications consent enforced at queue time (DB trigger) and re-checked at send time.

## Auth

- [ ] Email confirmation + redirect URLs configured for the production domain.
- [ ] First admin bootstrapped via SQL (not a hardcoded credential).
- [ ] Middleware guards `/dashboard/*`; public/marketing routes intentionally open.

## Sign-off

- [ ] Reviewed by: __________  Date: __________  Result: PASS / FAIL
