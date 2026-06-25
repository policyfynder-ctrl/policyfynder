# Local Development Setup — PolicyFynder

This guide gets the development environment running from a fresh clone.

---

## Prerequisites

| Tool         | Required Version | Check                                       |
| ------------ | ---------------- | ------------------------------------------- |
| Node.js      | ≥ 20             | `node --version`                            |
| npm          | ≥ 10             | `npm --version`                             |
| Supabase CLI | Any recent       | `supabase --version` (optional — see below) |

**Current environment (verified 2026-06-25):**

- Node.js v24.16.0 ✓
- npm 11.13.0 ✓
- Supabase CLI: **not installed** — see installation note below

### Supabase CLI (optional but recommended)

The CLI is used for:

- Applying migrations to a remote project (`supabase db push`)
- Generating TypeScript types (`supabase gen types typescript`)
- Running a local Supabase stack (`supabase start` — requires Docker)

**Install options:**

```bash
# macOS (Homebrew — recommended)
brew install supabase/tap/supabase

# npm (no Docker required for remote-only workflows)
npm install -g supabase

# Verify
supabase --version
```

If you skip the CLI, use the Supabase Dashboard SQL Editor to apply migrations and download types manually.

---

## Step 1 — Install Dependencies

```bash
cd /path/to/CRM
npm install
```

All packages are already in `node_modules/` on the current machine. Run only when setting up a new machine.

---

## Step 2 — Create `.env.local`

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the three values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

Get these from: **Supabase Dashboard → Your Project → Settings → API**

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` — `service_role` `secret` key — **never commit this**

`.env.local` is listed in `.gitignore` and will never be committed.

---

## Step 3 — Apply Migrations

### Option A: Supabase CLI (recommended)

```bash
# Link to your remote project (one-time setup)
supabase link --project-ref <your-project-ref>

# Apply all unapplied migrations
supabase db push
```

Find your project ref in: Supabase Dashboard → Project Settings → General → Reference ID

### Option B: Dashboard SQL Editor (no CLI required)

1. Open Supabase Dashboard → SQL Editor
2. Paste and run each migration file **in order**:
   - `supabase/migrations/20260625000001_initial_schema.sql`
   - `20260625000002_rls_policies.sql`
   - `20260625000003_indexes.sql`
   - `20260625000004_role_system.sql`
   - `20260625000005_org_structure.sql`
   - `20260625000006_capacity_config.sql`
   - `20260625000007_lead_enhancements.sql`
   - `20260625000008_notification_templates.sql`
   - `20260625000009_rls_v2.sql`
   - `20260625000010_indexes_v2.sql`
   - `20260625000011_activity_triggers.sql`

---

## Step 4 — Generate TypeScript Types

After migrations are applied, regenerate `src/types/database.ts`:

### With CLI

```bash
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

### Without CLI (Dashboard export)

1. Supabase Dashboard → SQL Editor
2. Run: `SELECT * FROM information_schema.columns WHERE table_schema = 'public'`
3. Or use the TypeScript types generator in the Supabase dashboard (API Docs → TypeScript)

The current `src/types/database.ts` is a placeholder that makes the type checker pass but returns empty types. Regenerate it before writing any service functions.

---

## Step 5 — First Admin Bootstrap

See [admin-bootstrap.md](./admin-bootstrap.md) for the complete procedure.

Short version: sign up, then run two SQL commands in the Supabase SQL Editor.

---

## Step 6 — Start the Dev Server

```bash
npm run dev
```

The app starts at `http://localhost:3000`.

**Current landing page:** Default Next.js template (will be replaced in Milestone 2).

---

## Step 7 — Verify the Setup

Run these checks in the Supabase SQL Editor to confirm migrations applied correctly:

```sql
-- 1. All 25 tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: 25 rows

-- 2. Head Office branch with code
SELECT id, name, code FROM branches;
-- Expected: { name: 'Head Office', code: 'head-office' }

-- 3. Roles seeded
SELECT name FROM roles ORDER BY name;
-- Expected: 7 rows (super_admin, admin, branch_manager, ...)

-- 4. Working hours seeded
SELECT COUNT(*) FROM working_hours_config;
-- Expected: 40

-- 5. Slot availability view works
SELECT * FROM v_slot_availability LIMIT 5;
-- Expected: rows with slot_date, slot_start, slot_end, branch_id, total_capacity, available_spots

-- 6. Activity log triggers work (insert a test lead, then check)
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 3;
```

---

## Useful Commands

```bash
# Start dev server
npm run dev

# TypeScript check (no errors expected)
npm run typecheck

# Format all files
npm run format

# Lint
npm run lint
```

---

## Project Structure Quick Reference

```
src/
  app/
    (auth)/          ← Login, signup pages (Milestone 2)
    (dashboard)/     ← Protected app pages (Milestone 3+)
    (public)/        ← Anonymous booking page (Milestone 4)
    api/             ← Server-side admin routes (Milestone 8)
  components/
    ui/              ← ShadCN primitives
    features/        ← Business components (Milestone 3+)
    layout/          ← Sidebar, Header (Milestone 3)
  lib/
    supabase/
      client.ts      ← Browser Supabase client
      server.ts      ← Server Supabase client
      middleware.ts  ← Session refresh
      admin.ts       ← Service role client (API routes only)
    nav.ts           ← Sidebar nav builder
    utils.ts         ← cn() helper
  services/          ← All DB queries (Milestone 3+)
  hooks/             ← React hooks (Milestone 3+)
  types/
    index.ts         ← App-level interfaces (complete)
    database.ts      ← Auto-generated Supabase types (regenerate after connect)
supabase/
  migrations/        ← 11 SQL migration files (deployment-ready)
  seed.sql           ← Dev seed data (2 branches, sample instructions)
docs/
  local-setup.md     ← This file
  deployment-checklist.md
  admin-bootstrap.md
architecture/        ← System design documentation
decisions/           ← Product decision records
```
