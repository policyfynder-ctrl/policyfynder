# Version

| Field | Value |
| --- | --- |
| **Version** | 1.0.0 |
| **Release** | `v1.0.0` (git tag) |
| **Date** | 2026-06-27 |
| **Database migration** | `20260625000027` (27 migrations) |
| **Branch** | `main` (single source of truth) |
| **Build** | ✅ PASS (46 static/SSG pages) |
| **Lint** | ✅ PASS |
| **Typecheck** | ✅ PASS |
| **Production audit** (`npm run production:check`) | ✅ READY (0 failed, 4 expected pre-launch warnings) |
| **Security headers** | ✅ present · `X-Powered-By` disabled |
| **Health endpoint** | ✅ `/api/health` operational |
| **Communications** | DRY-RUN (no live sending) |

Stack: Next.js 16 (App Router) · Supabase (Postgres/Auth/RLS) · Tailwind v4 · TypeScript.

See [RELEASE_NOTES_v1.0.md](./RELEASE_NOTES_v1.0.md) and
[FINAL_PRODUCTION_CHECKLIST.md](./FINAL_PRODUCTION_CHECKLIST.md).
