# Deployment Checklist — PolicyFynder

> **Moved.** Production deployment and launch docs now live in
> [`docs/production/`](./production/README.md). This file previously described an
> early state (11 migrations, no auth/dashboard) and is superseded.

Start here:

- [Production readiness index](./production/README.md)
- [Deployment (Vercel + Supabase)](./production/deployment.md)
- [Security checklist](./production/security.md)
- [Key rotation](./production/key-rotation.md)
- [Backup & recovery](./production/backup-recovery.md)
- [Monitoring & logging](./production/monitoring.md)
- [Launch checklist & Go/No-Go](./production/launch-checklist.md)

Pre-launch audit:

```bash
npm run production:check
```

First-admin bootstrap is unchanged — see [admin-bootstrap.md](./admin-bootstrap.md).
Current state: Next.js 16 + Supabase, **27 migrations** (latest `20260625000027`),
app version `1.0.0`, communications **dry-run by default**.
