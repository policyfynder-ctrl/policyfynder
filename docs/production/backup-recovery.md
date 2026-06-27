# Backup & Recovery

PolicyFynder's durable state is the Supabase Postgres database. The app itself is
stateless (redeployable from git). Plan for both data loss and bad releases.

## Backups

- [ ] Confirm Supabase automatic daily backups are enabled (plan-dependent).
- [ ] Enable **Point-in-Time Recovery (PITR)** for production (Supabase → Database → Backups)
      — lets you restore to a specific moment, not just the last daily snapshot.
- [ ] Record the backup retention window and where backups live.
- [ ] Keep the migration history in git as the schema source of truth (27 migrations).

## Restore procedure (database)

1. Identify the target timestamp (just before the incident).
2. Supabase dashboard → Database → Backups → restore (PITR) to that time, OR restore
   the latest snapshot.
3. If restoring into a fresh project, re-apply migrations first (`supabase db push`),
   then restore data.
4. Regenerate types if schema changed: `supabase gen types typescript --local > src/types/database.ts`.
5. Update app env to point at the restored project (if the URL/keys changed); redeploy.
6. Run `npm run production:check` and the [launch-checklist.md](./launch-checklist.md) smoke tests.

## App rollback (bad release)

- Vercel → Deployments → promote the previous good deployment (instant).
- Migrations are additive; a code rollback usually needs no DB change.

## Targets (set with stakeholders)

- **RPO** (max acceptable data loss): _____ (PITR ⇒ minutes).
- **RTO** (max acceptable downtime): _____ (Vercel rollback ⇒ minutes; DB restore ⇒ longer).

## Drill

- [ ] Perform a **test restore** into a scratch project at least once before launch and
      confirm the app boots against it. Document how long it took (informs RTO).
