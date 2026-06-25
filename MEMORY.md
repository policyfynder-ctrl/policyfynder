# PolicyFynder — Project Handoff

**Last updated:** 2026-06-25
**Phase:** Milestone 4 (Public Booking) COMPLETE on local. `/book/[branch]` builds lead+appointment with auto-assigned RM. Found & fixed 2 schema bugs (migrations 013 grants, 014 capacity-trigger ambiguity). ⚠️ Migrations 013+014 are LOCAL-only — cloud booking is BROKEN until they're pushed.

---

## Milestone 4 — Public Booking (complete on local 2026-06-25)

**Route:** `src/app/(public)/book/[branch]/page.tsx` (route group `(public)`, no auth). Server component resolves branch by `code` (404 if missing/inactive), fetches upcoming slots + products, renders `BookingForm`.

**Write path:** form → `POST /api/book` (`src/app/api/book/route.ts`) → `createBooking()` in `src/services/booking.ts` using the **admin/service-role client** (needed: `appointments.rm_id` is NOT NULL + must read appointments to avoid double-booking, which anon can't). It picks the **least-busy eligible RM** (covering schedule, not on leave, not booked at that slot, under daily cap), inserts lead (`source='direct'`, source_id, branch_id, status='scheduled', interests) + appointment (rm_id, branch_id, date, start/end, status='scheduled'), returns `confirmation_token`. Orphan lead is deleted if the appointment insert is rejected. Reads (`getBranchByCode`, `getAvailableSlots`, `getActiveProducts`) use the anon server client.

**Components:** `src/components/features/appointments/SlotPicker.tsx` (date-grouped time grid, client), `BookingForm.tsx` (client orchestrator: slot + details + submit + confirmation). Validation in `src/lib/booking/validation.ts` (shared client+server). Public layout `src/app/(public)/layout.tsx`.

**Two schema bugs found & fixed (both via the booking flow):**
1. **Migration 013 (`api_grants.sql`)** — `anon`/`authenticated`/`service_role` had NO SELECT/INSERT grants on local (only TRUNCATE/REFERENCES/TRIGGER). Postgres needs a GRANT *and* RLS. Supabase Cloud supplies these implicitly (so cloud reads worked); local/vanilla Postgres does not. Added the standard grants + ALTER DEFAULT PRIVILEGES. RLS still gates rows (verified: anon reads branches, gets `[]` for roles).
2. **Migration 014 (`fix_capacity_trigger.sql`)** — `get_slot_capacity`/`get_slot_availability` had BOTH a 2-arg and a 3-arg (`DEFAULT NULL`) overload, making every 2-arg call ambiguous (`function is not unique`). The capacity trigger called the 2-arg form → **every appointment insert failed**. Fixed: trigger now calls the 3-arg branch-aware form (`NEW.branch_id`, NULL=global); dropped the 2-arg overloads. **This bug exists on cloud too.**

**Verified end-to-end on LOCAL** (seeded 1 RM + 7-day schedule): page renders 200 with slots; valid booking → 200 + token, lead+appointment created with RM assigned; full slot → 409 + orphan cleaned; different slot → 200. typecheck/lint/format clean. `database.ts` regenerated from local (capacity now single 3-arg signature).

**CLOUD STATUS:** migrations 001–014 are now ALL on cloud (013+014 pushed 2026-06-25). Capacity fix verified on cloud — 2-arg `get_slot_availability` RPC returns a number (HTTP 200), no longer ambiguous. Booking write path is unblocked on cloud. Local and cloud are at migration parity (014).
**CLOUD BOOKING VERIFIED END-TO-END (2026-06-25):** seeded 1 RM (`cloud_rm@policyfynder.test`, rm_id `5c71d1a6-185e-421a-b79a-ae64408498f9`, branch Head Office) + 7-day schedule via service-role REST. Then: `/book/head-office` → 200 with slots; booking → 200 + token; lead (status=scheduled, source=direct, branch, interests) + appointment (RM assigned, token) created; `activity_logs` got `lead.created` + `appointment.booked` (audit triggers fire on cloud ✓); duplicate slot → 409 with orphan lead cleaned. All 10 checklist items pass.

**Cloud test data left in place:** the seeded RM (keep — needed for any booking) and one test booking (`cloudtest@example.com` lead + its 2026-06-26 appointment). The test booking can be deleted anytime; the RM should stay.

**Known limitation:** RM selection + insert aren't a single locked transaction → a tiny race window for concurrent bookings of the last slot; the capacity trigger caps gross overbooking. Future hardening: a SECURITY DEFINER `book_slot()` function with row locks.

---

## Milestone 3 — Dashboard Shell (complete 2026-06-25)

**Server-first shell.** `(dashboard)/layout.tsx` resolves the viewer once via `getCurrentViewer()` (React `cache()`), redirects to `/login` if absent, and renders `Sidebar` + `Header` + `main`.

**Role-aware sidebar:** `Sidebar.tsx` (server) takes `viewer.permissions` (from `get_user_permissions` RPC) → `buildNavItems(new Set(perms))` → renders `NavLink` (client, active-state via `usePathname`). Inaccessible items are never rendered.

**Header:** `Header.tsx` + `UserMenu.tsx` (native `<details>`, no client JS) — avatar/initials, name, email, role badge, and the existing `LogoutButton`. `RoleBadge.tsx` shows the primary role.

**Landing (`(dashboard)/page.tsx`):** welcome card + "Your role" (primary + all roles) + "Your permissions" (grouped by resource as badges).

**Services — `src/services/roles.ts`** (server-only): `hasPermission(resource,action)`, `getAccessibleBranchIds()`, `getUserPermissions()` (graceful []-fallback if RPC missing), `getCurrentUserRoles()`, `getCurrentViewer()` (cached), `requirePermission(resource,action,redirectTo?)` route guard. Pure helpers in **`src/lib/roles.ts`**: `ROLE_LABELS`, `roleLabel()`, `primaryRole()` (rank super_admin>admin>branch_manager>sales_manager>team_leader>rm>customer).

**New UI primitives:** `src/components/ui/card.tsx`, `badge.tsx`.

**Per-role nav verified** (ran real `buildNavItems` against each role's live permission set):

- customer → Dashboard
- rm → Dashboard, Leads, Follow-ups, Appointments, Reports
- team_leader → + Teams, RMs
- sales_manager / branch_manager → Dashboard, Leads, Appointments, Reports, Teams, RMs (no Follow-ups; no Branches — "Branches" nav gates on `branches.manage`, which is admin-only by design)
- super_admin → all 9 items

**Verified:** typecheck clean · lint clean · `/dashboard` signed-out → 307 /login · dev boots, no runtime errors.

**CLOUD STATUS:** All 12 migrations are now on cloud (migration 012 pushed 2026-06-25, `get_user_permissions` confirmed callable via REST → HTTP 200). `.env.local` points at cloud; the role-aware sidebar now works there. `database.ts` types were regenerated from local (include `get_user_permissions`). For in-browser role testing, bootstrap an admin (docs/admin-bootstrap.md) and assign roles via the SQL Editor, or use the local stack.

---

## Milestone 2 — Authentication (complete 2026-06-25)

**Approach:** Server-first. Forms are client components using `useActionState`; all auth logic lives in server actions (`src/services/auth.ts`, `'use server'`). No credentials in client state. Validation runs server-side (dependency-free, no zod). RLS + Supabase Auth do the real enforcement.

**Routes:**

- `/login`, `/signup`, `/reset-password` (route group `src/app/(auth)/`, shared centered `layout.tsx`)
- `/reset-password` is dual-mode: no session → request-link form; has session (arrived from reset email) → set-new-password form
- `/auth/callback` (route handler) → `exchangeCodeForSession` for email confirmation + reset links, then redirects to `?next=`
- Minimal `(dashboard)` placeholder added (layout auth-guard + page showing email + sign-out) so the "redirect unauthenticated away from dashboard" requirement is testable. Real shell = Milestone 3.

**Middleware (`src/lib/supabase/middleware.ts`):** unauthenticated `/dashboard/*` → `/login`; authenticated `/login`|`/signup` → `/dashboard`. `/reset-password` deliberately excluded from the authed bounce (logged-in user from reset email must reach the update form).

**Server actions:** `login`, `signup`, `requestPasswordReset`, `updatePassword`, `logout`. Generic error messages (no user enumeration). Signup sets `options.data.full_name` + `emailRedirectTo`; returns "check your email" when no session (confirmation ON).

**New components/files:** ui `input.tsx`, `label.tsx`; features/auth `AuthCard`, `FormField`, `FormBanner` (FormError/FormSuccess), `SubmitButton` (useFormStatus pending), `LoginForm`, `SignupForm`, `RequestResetForm`, `UpdatePasswordForm`, `LogoutButton`; lib `auth/validation.ts`.

**Verified:** typecheck clean · lint clean · /login,/signup,/reset-password → 200 · /dashboard signed-out → 307 /login · /auth/callback no-code → 307 /login?error.

**Cloud auth gotchas for testing:** email confirmation is ON by default on the cloud project → either confirm via email, disable it (Auth → Providers → Email), or create a pre-confirmed user via Auth → Users → Add user. For email links to work, ensure `http://localhost:3000/**` is in Auth → URL Configuration → Redirect URLs. After first login, run docs/admin-bootstrap.md to become super_admin.

**Onboarding verified (2026-06-25):** `handle_new_auth_user()` is redefined in **migration 004** (not 001) and does BOTH on every signup: (1) inserts the `profiles` row (`role = customer`), and (2) inserts a `user_roles` row (`customer`, scope `global`). Confirmed empirically by signing up a test user on the local stack — both rows appeared, cascade-deleted cleanly. The function is `SECURITY DEFINER SET search_path = public`, so its `user_roles` INSERT bypasses the `is_admin()` RLS check. No extra migration needed. (Earlier note claiming "only profile created" was wrong.)

**Not built yet (deferred):** real dashboard shell (Milestone 3).

---

## Migration 012 — get_user_permissions() (added 2026-06-25)

- **File:** `supabase/migrations/20260625000012_get_user_permissions.sql` (timestamp-prefixed to sort after 011; user referred to it as "000012").
- **Signature:** `get_user_permissions() RETURNS TEXT[]` · `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` · `GRANT EXECUTE TO authenticated`.
- **Returns:** sorted DISTINCT `resource || '.' || action` for `auth.uid()` across non-expired `user_roles` (joins user_roles → role_permissions → permissions). Same WHERE logic as `has_permission()`, so they always agree.
- **Why:** lets `lib/nav.ts → buildNavItems(perms: Set<string>)` fetch all permissions in one `supabase.rpc('get_user_permissions')` call instead of one RPC per nav item. Format `resource.action` matches buildNavItems keys exactly (verified against the seeded permission list).
- **Verified on LOCAL stack:** customer → `{appointments.create, appointments.view_own, leads.create, leads.view_own, notifications.view_own}`; super*admin → all 37; parity with `has_permission()` holds; every entry matches `^[a-z*]+\.[a-z_]+$`.
- **CLOUD STATUS: PUSHED (2026-06-25).** Cloud now has migrations 001–012. Confirmed callable via REST (HTTP 200, returns `[]` for service_role since `auth.uid()` is null). Push command used: `echo y | supabase db push --db-url "postgresql://postgres:<urlenc-pw>@db.hbdepkvjnvrmezdjvykh.supabase.co:5432/postgres"`.
- Migration count is now **12** (docs that still say "11 migrations" predate this and are non-critical prose).

---

## Local Stack (working as of 2026-06-25)

Running via **colima** (not Docker Desktop) + Supabase CLI 2.107.0.

- Start runtime: `colima start` (VM: 2 CPU / 4 GB)
- Start DB stack: `supabase start` (analytics disabled in config.toml — vector container can't mount docker.sock under colima)
- Local API URL: `http://127.0.0.1:54321` · Studio: `http://127.0.0.1:54323` · DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- `.env.local` currently points at the CLOUD project (see Milestone 3 caveat). To run against local, swap in the local URL + keys from `supabase status -o env` (commented template is in `.env.local`).
- `src/types/database.ts` regenerated from live schema (1525 lines, real types — no longer placeholder)
- No `psql` on host — query the DB via `docker exec -i supabase_db_CRM psql -U postgres -d postgres -c "..."`

**Smoke tests passed:** 25 public tables · branches (head-office + south-office) · 7 roles · 37 permissions · 40 working_hours_config rows · v_slot_availability returns branch-aware cols · activity-log trigger fires `lead.created` · typecheck clean · dev server serves HTTP 200.

**Migration bugs found & fixed during local validation (beyond the earlier 4):**

- Migrations 001 + 006: `generate_series(date, ..., INTERVAL '1 day')` returns _timestamps_, so `get_slot_capacity(DATE, TIME)` didn't match → cast `d.slot_date::date` (001) / wrapped generate_series in a `SELECT ...::date` subquery (006).
- Migration 009 `teams_select_authenticated`: bare `id` ambiguous against `user_roles`/`relationship_managers` → qualified to `teams.id` (2 spots).
- `supabase/config.toml`: `[analytics] enabled = false` for local colima compatibility.

**Note:** Actual app table count is **25**, not 22 (earlier docs undercounted). Verification queries in docs/ corrected.

## Cloud project (LIVE as of 2026-06-25)

- **Project ref:** `hbdepkvjnvrmezdjvykh` · URL `https://hbdepkvjnvrmezdjvykh.supabase.co`
- All 11 migrations pushed via `supabase db push --db-url "postgresql://postgres:<urlenc-pw>@db.hbdepkvjnvrmezdjvykh.supabase.co:5432/postgres"` (CLI not logged in — used direct `--db-url`, not `link`, since no access token).
- `.env.local` now points at CLOUD (anon + service_role keys, both legacy JWT format).
- Seed.sql NOT run on cloud → cloud has only Head Office branch (South Office is local-only dev data). Roles/permissions/products/working_hours all present (they live in migrations, not seed).
- **Cloud verified via REST API:** 7 roles, 37 permissions, 40 working_hours, 5 products, Head Office active. Anon CAN read active branches; anon CANNOT read roles (RLS enforced ✓).

**Connectivity gotchas:**

- Direct DB host `db.<ref>.supabase.co:5432` is **IPv6-only** — reachable from the Mac (has IPv6) but NOT from inside the colima VM/containers. So query cloud from the host (Mac) or via REST API, not via `docker exec ... psql`.
- `supabase gen types --db-url <remote>` would spawn a pg-meta container that hits the same IPv6 issue → don't bother; the local-generated `src/types/database.ts` is valid for cloud (identical schema).
- To enable `supabase link` / plain `supabase db push` later, run `supabase login` (needs an access token from the dashboard).

**TODO for user:** rotate the service_role key + DB password (they were pasted in chat). Settings → API (roll service key) and Settings → Database (reset password); then update `.env.local`.

**Next (Milestone 2):** auth pages (`/login`, `/signup`), then dashboard shell + `get_user_permissions()` RPC for the sidebar.

---

## Last Session

**Date:** 2026-06-25
**What was built:**

- Architecture review report (19 findings: 6 Critical, 9 Recommended, 4 Future)
- 8 new migration files (migrations 4–11) addressing all 6 Critical and 8 Recommended findings
- Updated `src/types/index.ts` with all new interfaces (Role, Team, WorkingHoursConfig, LeadFollowUp, etc.)
- Full rewrite of all 4 architecture docs (`system-design.md`, `database-schema.md`, `frontend-structure.md`, `backend-structure.md`)
- Updated `decisions/product-decisions.md` with all new design decisions

**What was decided:**

- Role system: table-based RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`) replaces the 3-value enum approach
- Org hierarchy: `teams` + `team_members` tables; `team_id` on `relationship_managers`
- Capacity: `working_hours_config` drives slot generation; capacity functions now branch-aware
- Leads: `follow_up_at`, `sla_deadline_at`, `priority` added; `lead_sources` table replaces enum
- Notifications: `notification_templates` table + retry columns on `notifications`
- RLS v2: `has_permission()`, `get_accessible_branch_ids()`, `get_accessible_rm_ids()` helper functions

**Migration fixes applied (2026-06-25):**

- Migration 001: `branches` now has `code TEXT UNIQUE`; seeded Head Office with `'head-office'`
- Migration 001: `activity_logs.changes` renamed to `activity_logs.metadata` to match migration 011 triggers
- Migration 002: `branches` SELECT policy replaced — anonymous users can read `is_active = true` rows; authenticated users can read all rows

**Stopped at:** Milestone 1 complete. All 3 Must Fix items resolved. Local dev environment verified and documented.
**Next action:** Connect Supabase → fill `.env.local` → apply all 11 migrations → `supabase gen types typescript` → then begin Milestone 2 (auth pages)

**Milestone 1 deliverables (completed 2026-06-25):**

- `src/lib/supabase/admin.ts` — service role client (API routes only)
- `src/lib/nav.ts` — permission-driven sidebar nav builder
- `src/app/(public)/book/[branch]/` — directory created for Milestone 4 booking page
- `supabase/seed.sql` — South Office branch updated with `code = 'south-office'`
- `docs/local-setup.md` — full local dev setup guide
- `docs/deployment-checklist.md` — 9-phase deployment checklist
- `docs/admin-bootstrap.md` — first admin + RM onboarding SQL guide

---

## What PolicyFynder Is

Insurance lead generation and appointment booking CRM.
Customers arrive via ads/direct → book an appointment → Relationship Manager (RM) handles the consultation → lead converts to a policy sale.

**Role hierarchy:** Super Admin → Admin → Branch Manager → Sales Manager → Team Leader → RM → Customer

---

## Architecture Decisions

| Decision        | Choice                                                             |
| --------------- | ------------------------------------------------------------------ |
| Framework       | Next.js 16.2.9, App Router, `src/` layout                          |
| Language        | TypeScript 5                                                       |
| Database + Auth | Supabase (PostgreSQL + Auth + Storage)                             |
| Styling         | Tailwind CSS v4                                                    |
| UI Components   | ShadCN (initialized; `components.json` present)                    |
| Deployment      | Vercel (app) + Supabase (DB)                                       |
| Auth strategy   | Supabase Auth, cookie sessions via `@supabase/ssr`                 |
| Role system     | Table-based RBAC (`roles`, `permissions`, `user_roles`) — NOT enum |
| Multi-tenancy   | Single-tenant for now (per-user RLS). No org model yet.            |

**Three Supabase clients — use the correct one:**

- `src/lib/supabase/client.ts` — browser (`'use client'` components)
- `src/lib/supabase/server.ts` — server components and API routes
- `src/lib/supabase/middleware.ts` — session refresh per request

**Auth middleware** (`src/middleware.ts`) — redirects unauthenticated users from `/dashboard/*` to `/login`.

---

## Database Decisions

**22 tables total. 11 migration files written. NOT applied to any Supabase instance yet.**

### Original Tables (migrations 1–3)

| Table                   | Purpose                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `profiles`              | All users; auto-created by trigger on auth signup                                                    |
| `branches`              | Multi-branch support; default "Head Office" seeded                                                   |
| `insurance_products`    | 5 product types seeded                                                                               |
| `relationship_managers` | +`team_id`, +`service_areas` (added in migration 7)                                                  |
| `rm_specializations`    | M:M — which products each RM handles                                                                 |
| `rm_schedules`          | Weekly recurring hours per RM                                                                        |
| `rm_leave`              | Date-specific unavailability                                                                         |
| `leads`                 | Core entity; extended with branch_id, follow_up_at, sla_deadline_at, priority, source_id, geo fields |
| `appointments`          | +`branch_id` denormalized; `appointment_in_future` constraint REMOVED                                |
| `lead_assignments`      | Full assignment history                                                                              |
| `lead_notes`            | Notes/calls/meetings                                                                                 |
| `lead_stage_history`    | Immutable; auto-populated by trigger                                                                 |
| `notifications`         | +`template_ref_id`, +retry columns                                                                   |
| `activity_logs`         | Immutable; now auto-populated by 6 triggers                                                          |

### New Tables (migrations 4–11)

| Table                    | Purpose                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `roles`                  | Named roles (super_admin, admin, branch_manager, sales_manager, team_leader, rm, customer) |
| `permissions`            | Resource × action permission matrix                                                        |
| `role_permissions`       | Assigns permissions to roles                                                               |
| `user_roles`             | Scoped role assignments per user (global / branch / team scope)                            |
| `teams`                  | Teams within a branch; has team_leader_rm_id                                               |
| `team_members`           | History-preserving team membership (joined_at, left_at)                                    |
| `working_hours_config`   | Config-driven slot definitions per branch/day; replaces hardcoded view                     |
| `branch_holidays`        | Date-specific branch closures                                                              |
| `lead_sources`           | Lookup table replacing lead_source enum                                                    |
| `lead_follow_ups`        | Scheduled follow-up actions per lead                                                       |
| `notification_templates` | WhatsApp/email/SMS template registry                                                       |

### New RLS Helper Functions (migration 9)

- `has_permission(resource, action)` — RBAC check
- `get_accessible_branch_ids()` — branches the user manages
- `get_accessible_rm_ids()` — RMs whose data the user can see

### Key Schema Rules

- Money as integers in cents
- Soft deletes on all core entities (`deleted_at TIMESTAMPTZ`)
- `profiles.role` (enum) retained for backward compat; new code uses `user_roles`
- `leads.source` (enum) retained; new code uses `source_id` FK to `lead_sources`
- Activity log triggers cover: lead.created, lead.assigned, appointment.booked, appointment.status_changed, rm.activated/deactivated, role.assigned/revoked
- Capacity functions are now branch-aware: `get_slot_capacity(date, time, branch_id)`
- `morning` and `afternoon` leave_type values are deprecated — use `custom` with explicit times

**Lead pipeline (fixed):** `new → scheduled → contacted → proposal_sent → converted → lost`

---

## Verified File State (from disk)

### Done ✓ — files exist and are non-empty

- `src/middleware.ts` (13 lines) — auth redirect guard
- `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` — Supabase clients
- `src/lib/supabase/admin.ts` — service role client (import only in `src/app/api/`)
- `src/lib/nav.ts` — `buildNavItems(perms: Set<string>): NavItem[]`
- `src/types/index.ts` (~300 lines) — all app types including new RBAC, team, capacity types
- `src/types/database.ts` — PLACEHOLDER (regenerate after Supabase connect)
- `src/lib/utils.ts` — ShadCN `cn()` helper
- `src/components/ui/button.tsx` — only ShadCN component installed
- `supabase/migrations/20260625000001_initial_schema.sql` — branches has `code`; activity_logs column is `metadata`
- `supabase/migrations/20260625000002_rls_policies.sql` — branches has two SELECT policies (anon: active only; authed: all)
- `supabase/migrations/20260625000003_indexes.sql` (167 lines)
- `supabase/migrations/20260625000004_role_system.sql` — RBAC tables + seeded roles/permissions
- `supabase/migrations/20260625000005_org_structure.sql` — teams, team_members, branch_id on leads/appointments
- `supabase/migrations/20260625000006_capacity_config.sql` — working_hours_config, branch_holidays, config-driven view
- `supabase/migrations/20260625000007_lead_enhancements.sql` — lead_sources, lead_follow_ups, new lead columns
- `supabase/migrations/20260625000008_notification_templates.sql` — template registry + retry columns
- `supabase/migrations/20260625000009_rls_v2.sql` — hierarchy-aware RLS helpers + policies
- `supabase/migrations/20260625000010_indexes_v2.sql` — indexes for all new tables
- `supabase/migrations/20260625000011_activity_triggers.sql` — 6 activity log triggers
- `.prettierrc`, `.env.local.example`, `components.json`
- `decisions/product-decisions.md` — updated with all new decisions
- `.claude/skills/`: run, test, db, deploy, feature, project-rules, context-handoff
- `docs/local-setup.md` — local dev setup guide (Node, CLI, env vars, migration steps, verify SQL)
- `docs/deployment-checklist.md` — 9-phase deployment checklist
- `docs/admin-bootstrap.md` — first admin bootstrap SQL + RM onboarding patterns

### Not Done — directories exist but are empty

- `src/app/(auth)/` — login, signup, reset-password pages
- `src/app/(dashboard)/` — all dashboard pages
- `src/components/features/` — leads, quotes, policies, dashboard components
- `src/components/layout/` — sidebar, header, nav
- `src/services/` — all database query functions
- `src/hooks/` — all custom React hooks
- `supabase/functions/` — Edge Functions

### Stock / untouched

- `src/app/layout.tsx`, `src/app/page.tsx` — create-next-app defaults

---

## Immediate Next Steps (ordered)

1. **Connect Supabase** — create project at supabase.com, copy keys to `.env.local`
2. **Apply migrations** — `supabase db push` or paste SQL into Supabase SQL editor (run 1–11 in order)
3. **Regenerate types** — `npx supabase gen types typescript --local > src/types/database.ts`
4. **Assign admin user_role** — after first auth signup, manually insert a `super_admin` user_role for yourself
5. **Auth pages** — `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `reset-password/page.tsx`
6. **Dashboard layout** — `src/app/(dashboard)/layout.tsx` with auth check + sidebar shell
7. **Public booking page** — lead form + slot picker using `v_slot_availability` view
8. **Lead list page** — `src/app/(dashboard)/leads/page.tsx` + `src/services/leads.ts`
9. **RM appointment view** — calendar/list of upcoming appointments
10. **Admin RM management** — create/activate/deactivate RMs, set schedules, assign to teams

---

## Known Assumptions

- Timezone: all appointments in `Asia/Kolkata`. `working_hours_config` is timezone-ready but timezone enforcement not yet implemented.
- Slot duration: 60 minutes (seeded in working_hours_config). Change by updating the config row — no migration needed.
- One RM per appointment. No team consultations.
- No payment integration.
- RM assignment is manual (admin assigns). Schema supports round-robin/least-busy/specialist/geographic.
- No tests yet. No test runner configured.
- `src/types/database.ts` is a placeholder — must regenerate after Supabase connection.
- `.claude/architecture/` — legacy tRPC/Prisma docs from early session. Ignore.

---

## Session Working Rules

1. Read only files directly related to the current task
2. Never scan the entire repository — target specific folders
3. All DB queries go in `src/services/` — never in components
4. Check `src/components/` before creating any new component
5. When context exceeds ~60%, run `context-handoff` skill

---

## Memory Files Index

`/Users/bharathnarayam/.claude/projects/-Users-bharathnarayam-Documents-CRM/memory/`

- [user_profile.md](memory/user_profile.md)
- [project_status.md](memory/project_status.md)
- [project_decisions.md](memory/project_decisions.md)
- [feedback_coding_style.md](memory/feedback_coding_style.md)
- [reference_external.md](memory/reference_external.md)
