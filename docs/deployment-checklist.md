# Deployment Checklist — PolicyFynder

Use this checklist when deploying PolicyFynder to a Supabase project for the first time, or when deploying a new environment (staging, production).

---

## Phase 1 — Supabase Project Setup

- [ ] Create a new Supabase project at supabase.com
- [ ] Note the **Project Reference ID** (Settings → General → Reference ID)
- [ ] Note the **Project URL** (Settings → API → Project URL)
- [ ] Note the **anon public key** (Settings → API → Project API Keys → anon public)
- [ ] Note the **service_role secret key** (Settings → API → Project API Keys → service_role)
  - Keep this secret — it bypasses all Row Level Security

---

## Phase 2 — Local Environment

- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Fill `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Fill `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Fill `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Confirm `.env.local` is listed in `.gitignore` (it is — do not commit)

---

## Phase 3 — Apply Migrations

Run all 11 migrations **in order**. No migration depends on a later one.

| #   | File                                        | What it creates                                                                            |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | `20260625000001_initial_schema.sql`         | 14 core tables, all enums, triggers, capacity functions, view                              |
| 2   | `20260625000002_rls_policies.sql`           | `is_admin()`, `is_rm()`, `get_rm_id()`, all base RLS policies                              |
| 3   | `20260625000003_indexes.sql`                | 18 core performance indexes                                                                |
| 4   | `20260625000004_role_system.sql`            | RBAC tables, 7 seeded roles, ~40 permissions, full permission matrix                       |
| 5   | `20260625000005_org_structure.sql`          | teams, team_members; branch_id on leads/appointments                                       |
| 6   | `20260625000006_capacity_config.sql`        | working_hours_config, branch_holidays; config-driven v_slot_availability                   |
| 7   | `20260625000007_lead_enhancements.sql`      | lead_sources, lead_follow_ups; priority/SLA/geo on leads                                   |
| 8   | `20260625000008_notification_templates.sql` | notification_templates; retry columns on notifications                                     |
| 9   | `20260625000009_rls_v2.sql`                 | has_permission(), get_accessible_branch_ids(), get_accessible_rm_ids(); hierarchy policies |
| 10  | `20260625000010_indexes_v2.sql`             | 25 indexes on all new tables                                                               |
| 11  | `20260625000011_activity_triggers.sql`      | 6 activity log triggers                                                                    |

### Apply via Supabase CLI

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Apply via Dashboard (if CLI not installed)

Paste each file into the SQL Editor and click **Run**. Start from 000001. Do not skip files.

---

## Phase 4 — Verify Migration Apply

Run in Supabase SQL Editor:

```sql
-- Verify all 25 tables
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- Expected: 25

-- Verify seed data
SELECT name, code FROM branches;
-- Expected: Head Office | head-office

SELECT COUNT(*) FROM roles;
-- Expected: 7

SELECT COUNT(*) FROM permissions;
-- Expected: ~40

SELECT COUNT(*) FROM working_hours_config;
-- Expected: 40

-- Verify v_slot_availability returns rows
SELECT COUNT(*) FROM v_slot_availability;
-- Expected: > 0 (depends on working days in next 29 days)
```

---

## Phase 5 — Generate TypeScript Types

```bash
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

Confirm `src/types/database.ts` no longer contains `Record<string, never>` — it should have table definitions.

---

## Phase 6 — First Admin Bootstrap

**See [admin-bootstrap.md](./admin-bootstrap.md) for the complete procedure.**

Summary:

1. Sign up at the app URL (or via Supabase Auth dashboard)
2. Run the two-step SQL in the Supabase SQL Editor
3. Verify your profile has both `role = 'admin'` and a `super_admin` row in `user_roles`

---

## Phase 7 — Smoke Tests

Run these after bootstrap to confirm the core flows work:

```sql
-- 1. Anonymous branch lookup (simulates booking page)
SELECT id, name, code FROM branches WHERE code = 'head-office' AND is_active = true;
-- Expected: 1 row

-- 2. Permission check for super_admin (replace with your profile UUID)
SELECT has_permission('leads', 'view_all');
-- Expected: true

-- 3. Accessible branches for super_admin
SELECT get_accessible_branch_ids();
-- Expected: array with Head Office UUID

-- 4. Activity log trigger test
INSERT INTO leads (first_name, last_name, email, phone, source, status)
VALUES ('Test', 'Lead', 'test@example.com', '1234567890', 'direct', 'new');
SELECT entity_type, action FROM activity_logs ORDER BY created_at DESC LIMIT 1;
-- Expected: { entity_type: 'lead', action: 'lead.created' }
```

---

## Phase 8 — Dev Server

```bash
npm run dev
```

Confirm the app starts without errors at `http://localhost:3000`.

```bash
npm run typecheck
```

Confirm zero TypeScript errors after type generation.

---

## Phase 9 — Vercel Deployment (when ready)

- [ ] Push code to GitHub repository
- [ ] Connect repository to Vercel
- [ ] Add all three environment variables in Vercel project settings:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Trigger a deploy and confirm build passes
- [ ] Confirm production URL resolves

**Note:** Production Supabase project should be separate from development. Apply all 11 migrations to the production project independently.

---

## Known Limitations at First Deploy

| Limitation                                          | Impact                                          | When resolved                   |
| --------------------------------------------------- | ----------------------------------------------- | ------------------------------- |
| `src/types/database.ts` is a placeholder            | Supabase query types are `any`                  | After Phase 5 (type generation) |
| No auth pages built yet                             | Cannot sign in via the UI                       | Milestone 2                     |
| No dashboard built yet                              | No UI after login                               | Milestone 3                     |
| `enforce_appointment_capacity` ignores branch_id    | Global capacity check (works for single branch) | Before second branch added      |
| `user_roles` admin management requires service role | Role assignment needs SQL Editor                | Milestone 8                     |
