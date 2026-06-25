# Skill: deploy

Pre-deploy checklist and deployment steps for PolicyFynder.

## When to Use

- User asks to deploy or ship a change
- Preparing a PR for merge to main
- Verifying a production deployment succeeded

## Pre-Deploy Checklist

Run through these before merging or deploying:

```bash
# 1. All tests pass
npm test

# 2. No TypeScript errors
npm run typecheck

# 3. No lint errors
npm run lint

# 4. Build succeeds locally
npm run build
```

Check manually:

- [ ] No `.env.local` secrets committed (`git diff --staged` scan)
- [ ] No `console.log` left in production code paths
- [ ] Any new env vars documented in CLAUDE.md and added to Vercel/Railway
- [ ] Database migrations are backwards-compatible (no breaking column drops without a transition period)

## Deploy Steps

### Deploy to Vercel (app)

Deployments are automatic on merge to `main`. To trigger manually:

```bash
vercel --prod
```

### Deploy database migrations (Railway)

```bash
DATABASE_URL=<prod-url> npx prisma migrate deploy
```

Run this BEFORE deploying the app when a migration is included.

**Migration order always: DB first, then app.**

### Verify deployment

1. Check Vercel deployment log for build errors
2. Open production URL and test the changed feature
3. Check Railway logs for any DB errors post-migration

## Rollback

- **App**: Vercel dashboard → Deployments → Instant Rollback on prior deployment
- **DB**: There is no automatic rollback. Write compensating migrations if needed.

## Notes

- Never force-push to `main`
- Tag releases: `git tag v<major>.<minor>.<patch>` after significant milestones
