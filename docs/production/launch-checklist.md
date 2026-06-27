# Launch Checklist & Go/No-Go

The final gate before going live. Complete every section; record the decision at the
bottom. Pair this with the auto-generated [`LAUNCH_REPORT.md`](../../LAUNCH_REPORT.md).

## Build & quality

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — succeeds
- [ ] `npm run production:check` — 0 failures (warnings reviewed)

## Configuration

- [ ] Production Supabase project, all 27 migrations applied, migration count matches repo
- [ ] Vercel env vars set (Supabase trio, `NEXT_PUBLIC_SITE_URL`, `COMMUNICATIONS_DRY_RUN`)
- [ ] Secrets rotated where exposed ([key-rotation.md](./key-rotation.md))
- [ ] Custom domain + HTTPS; Auth redirect URLs updated

## Security & data

- [ ] [security.md](./security.md) reviewed and signed off
- [ ] [backup-recovery.md](./backup-recovery.md): backups + PITR enabled; test restore done
- [ ] [monitoring.md](./monitoring.md): uptime monitor on `/api/health`

## Functional QA — end-to-end simulation

Run the full flow (locally against a production build, or on a staging deploy — **not**
against live production data). Each step must pass:

1. [ ] Landing page renders (`/`)
2. [ ] Book a free consultation (`/book`) — branch hidden, slot + details submit
3. [ ] Lead created (source captured)
4. [ ] RM assigned automatically (appointment has an RM)
5. [ ] Log in as RM
6. [ ] Convert lead (status → converted)
7. [ ] Create a policy
8. [ ] Customer portal shows the policy
9. [ ] Queue a communication (dry-run; consent enforced)
10. [ ] Reports reflect the data
11. [ ] Renewals view works
12. [ ] Permissions enforced (RM cannot see out-of-scope data; customer sees only own)

## Comms posture

- [ ] `COMMUNICATIONS_DRY_RUN=true` (no live email/WhatsApp/SMS) unless providers are
      explicitly approved + configured ([../communication-providers.md](../communication-providers.md))

## Go / No-Go

- Decision: **GO / NO-GO**
- Approver: __________  Date: __________
- Outstanding/known issues: __________
