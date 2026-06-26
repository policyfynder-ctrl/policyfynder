# PolicyFynder — Project Handoff

**Last updated:** 2026-06-26
**Phase:** Milestones 1–10 COMPLETE (built, verified local+cloud, committed, pushed). **Cloud + local at migration parity: 024.** On branch `milestone-10`. Next milestone: TBD.

**Open PRs (stacked, merge bottom-up 5→6→7→8→9→10):** [#2](https://github.com/policyfynder-ctrl/policyfynder/pull/2) 5→main · [#3](https://github.com/policyfynder-ctrl/policyfynder/pull/3) 6→5 · [#1](https://github.com/policyfynder-ctrl/policyfynder/pull/1) 7→6 · [#4](https://github.com/policyfynder-ctrl/policyfynder/pull/4) 8→7 · [#5](https://github.com/policyfynder-ctrl/policyfynder/pull/5) 9→8 · #6 10→9. Repo: `github.com/policyfynder-ctrl/policyfynder`.

**Cloud test data note:** Cloud test data has been cleaned up. The disposable cloudtest@example.com lead, appointment, and related activity logs were deleted after Milestone 10 verification. The seeded RM (cloud_rm@policyfynder.test) and its schedules remain as permanent seed data.

**Cloud push command** (CLI not linked; password URL-encoded @→%40 #→%23 %→%25):
`echo y | supabase db push --db-url "postgresql://postgres:Ka03%4054962%234%25@db.hbdepkvjnvrmezdjvykh.supabase.co:5432/postgres"`
Run cloud queries from the Mac (host) or REST — the direct DB host is IPv6-only (unreachable from colima containers). Local DB: `docker exec -i supabase_db_CRM psql -U postgres -d postgres -c "..."` (no psql on host).

**Standing workflow (user-enforced every milestone):** investigate schema/RLS first → present migrations → WAIT for approval → apply LOCAL → build → verify LOCAL → STOP for approval before cloud push → STOP for separate approval before commit/push. Never push cloud or commit without explicit go-ahead.

---

## Milestone 10 — Reports & Analytics (COMPLETE — local+cloud+committed, 2026-06-26)

Migration 024 on cloud (verified 7/7 e2e: 12 functions execute; plain RM sees own only; branch manager branch-scoped; admin all; no leakage). Committed + pushed `milestone-10`; PR #6 (base milestone-9). **Approach:** 12 `SECURITY DEFINER STABLE` reporting functions that re-apply caller scope via `get_accessible_branch_ids()/get_accessible_rm_ids()/get_accessible_team_ids()` — report scope == data scope, NO RLS/permission changes (`reports.view_*` already seeded, used for page/section gating). Functions: `report_overview` (JSONB KPIs), `report_lead_funnel(from,to)`, `report_lead_sources(from,to)`, `report_leads_monthly(months)`, `report_appointment_stats(from,to)`, `report_policy_status`, `report_policy_by_insurer`, `report_policy_by_product`, `report_renewals` (JSONB), `report_rm_performance`, `report_team_performance`, `report_branch_performance`. Added indexes `idx_appointments_status`, `idx_policies_created_at`, `idx_tasks_completed`. App: `src/services/reports.ts` (typed RPC wrappers); `/dashboard/reports` (date-range filter; sections role-gated — branch scorecard→view_branch/all, team→view_team+, RM scorecard→all viewers); components `KpiTiles`/`DistributionBars`/`ReportTable`/`RenewalsSummary`. Nav Reports entry pre-existing. Money fields reference-only.

---

## Milestone 9 — Renewals & Reminders automation (COMPLETE — local+cloud+committed, 2026-06-26)

Migrations 022+023 on cloud (verified 8/8 e2e: generates 1 task + 1 in-app notification, idempotent re-run = 0 dups, queue-only no email/WhatsApp/SMS, task RLS scope RM-own/unrelated-0/branch-manager). Committed + pushed `milestone-9`; PR #5 (base milestone-8). App: services `tasks.ts` (list/create/complete), `notifications.ts` (pending renewal reminders), `policies.listRenewals(window)`; admin API `POST /api/admin/renewals` (session + `renewals.manage` → service-role calls the function); pages `/dashboard/renewals` (30/60/90/overdue windows; row actions log-contact/create-task/mark-renewed; `renewals.manage`-gated Generate button) + `/dashboard/tasks` (open/completed + Complete); components in `features/renewals` + `features/tasks`; nav Renewals + Tasks.

**Scope chosen by user.** Build on M8 policy renewal fields. Decisions locked:
- **Scheduling:** a `generate_renewal_reminders()` SECURITY DEFINER function invoked by a service-role admin API route (`/api/admin/renewals/generate`), pg_cron-ready. No edge functions.
- **Delivery:** QUEUE ONLY — generate task + in-app notification rows. NO email/WhatsApp/SMS/provider integration.
- **Tasks:** a GENERIC `tasks` table (leads/policies/appointments/general), not a policy-specific mirror. (Existing `lead_follow_ups` is unused/nav-only — left as legacy, not refactored.)

**Migration files WRITTEN (on disk, NOT applied):**
- `supabase/migrations/20260625000022_notifications_policy_link.sql` — `ALTER TYPE notification_type ADD VALUE 'policy_renewal_reminder' / 'policy_renewal_overdue'`; `notifications.policy_id` FK + index. (Enum values in their own file — can't ADD+USE a value in one txn.)
- `supabase/migrations/20260625000023_renewals_automation.sql` — `tasks` table (+RLS scoped by assigned_rm/get_accessible_rm_ids, +grants, +indexes incl. `idx_tasks_open_renewal`); replaces notifications recipient-only SELECT with `notifications_select_scoped` (recipient OR policy/lead in scope); `generate_renewal_reminders(p_days_ahead INT DEFAULT 30)`; task audit triggers (`task.created`/`task.completed`) + `activity_logs_select_scoped` extended to include `task`; permissions (`tasks.*` + `renewals.manage`) mapped to roles.

**`generate_renewal_reminders()` contract (user-specified):** for each active policy due to renew within N days (renewal_completed_at IS NULL, has assigned RM):
- **(1) MANDATORY task** — entity_type='policy', entity_id=policy_id, kind='renewal', assigned_rm_id=policy.assigned_rm_id, title='Policy renewal due', due_at=renewal_date::timestamptz, completed_at NULL, note=`Renewal due on <date> for policy <number>`.
- **(2) OPTIONAL in-app notification** — type 'policy_renewal_reminder', channel 'in_app', status 'pending'.
- **Idempotent:** skip if an OPEN renewal task already exists for the policy; skip if a pending/sent/delivered renewal notification already exists. Returns count of TASKS created.

**NEXT SESSION — M9 build (after applying migrations):**
1. `supabase db reset` (applies 022+023) → `supabase gen types typescript --local > src/types/database.ts`.
2. Services: `src/services/tasks.ts` (list scoped, create, complete), `src/services/notifications.ts` (list own/scoped). Reuse `staffNameMap` for RM names.
3. Admin API: `src/app/api/admin/renewals/route.ts` (POST; verify session + `renewals.manage`; service-role calls `generate_renewal_reminders`). Mirror `/api/admin/rms` auth pattern.
4. Pages: `/dashboard/renewals` (policies due to renew — filters 30/60/90 + overdue; row actions: log contact → policies.update last_contacted_at, create task, mark renewed → renewal_completed_at). `/dashboard/tasks` (RM task queue: open/completed, complete action). Add a "Generate renewal reminders" button gated by `renewals.manage`.
5. Nav (`src/lib/nav.ts`): add **Tasks** (`tasks.view_*`) and **Renewals** (`renewals.manage` or `policies.view_*`). Add types to `src/types/index.ts`.
6. Verify LOCAL: typecheck/lint/build; RLS harness (task scope per role; generate function creates task+notification, is idempotent on 2nd run — 0 new; audit task.created/completed). THEN stop for cloud-push approval, then commit/PR (base milestone-8) approval.

---

## Milestone 8 — Policy Management (COMPLETE — local+cloud+committed, 2026-06-26)

Committed `f121645` on `milestone-8`, pushed; [PR #4](https://github.com/policyfynder-ctrl/policyfynder/pull/4) (base milestone-7). Migrations 020+021 on cloud (verified 9/9 e2e). **PolicyFynder tracks the policy LIFECYCLE, not payments** (no payment_frequency/billing; premium/sum_assured are reference-only).

**Migration 020 `policy_management`:** `insurers` table (6 seeded carriers) + `policies` table. policy_number = insurer's real number (required, unique, user-entered — never generated). Cols: customer_profile_id/lead_id/appointment_id/product_id/insurer_id/assigned_rm_id/branch_id; denormalized holder_name/email/phone (mirrors leads — avoids self+admin profiles RLS); premium_cents/sum_assured_cents (BIGINT, reference); status enum (draft/active/lapsed/cancelled/expired); issue/start/expiry/renewal_date; **renewal_completed_at**, **last_contacted_at** (lifecycle/follow-up). RLS = base (is_admin/is_rm/get_rm_id) + hierarchy (get_accessible_*) + scoped insert. Audit triggers: policy.created/updated/deleted/assigned/status_changed; `activity_logs_select_scoped` extended for 'policy'. **Migration 021 `policy_permissions`:** `policies` resource (9 actions) mapped to roles.

**App:** services `policies.ts` (list+filters+pagination, getPolicy, create/update/softDelete, getPolicyDashboard, listAssignableRms, currentRmId), `insurers.ts`, `products.ts` (+ `leads.ts` getLeadCore/listLeadOptions). RM names via `v_staff_directory` (M7). Pages `/dashboard/policies` (search + status/insurer/product/expiry filters + pagination), `[id]` (detail + activity timeline + edit + soft-delete), `new`. Components in `features/policies/`. Dashboard widget `PolicyStats`: **Active, Expiring, Renewals Due, Renewals Completed, Recently Added** (all RLS-scoped). Nav: Policies gated by `policies.view_*`. Pure helpers `src/lib/policies.ts`.

---

## Milestone 7 — RM & Team Management (built local 2026-06-25, branch milestone-7)

**Pages:** `/dashboard/rms` (+ `[id]`) and `/dashboard/teams` (+ `[id]`). RM list/detail (status, branch, team, weekly schedule editor, activate/deactivate); team list/detail (branch, leader, member management). Server-first; RLS scopes reads/writes (no admin client in dashboard features).

**Services (session/RLS client):** `src/services/rms.ts` (listRms, getRm, setRmActive, addRmSchedule, deleteRmSchedule), `src/services/teams.ts` (listTeams, getTeam, createTeam, addTeamMember, removeTeamMember [history-preserving: is_current=false], listAssignableRms), `src/services/branches.ts` (listManageableBranches). Pure helpers `src/lib/rms.ts`. Server actions in `(dashboard)/rms/actions.ts` + `(dashboard)/teams/actions.ts`.

**RM creation — `POST /api/admin/rms`** (the only service-role usage): authorizes caller server-side (session + `rms.manage_branch` + branch in `get_accessible_branch_ids`), then promotes an existing user OR creates a new login (`auth.admin.createUser`) → sets `role='rm'`, upserts the RM record, assigns the global `rm` user_role. Service key never reaches the browser.

**Embedding note:** RM↔teams has two FKs → `team:teams!relationship_managers_team_id_fkey(...)` and `leader:relationship_managers!teams_team_leader_rm_id_fkey(...)` disambiguate.

**Migrations (LOCAL ONLY — cloud push pending approval):**
- **018 `rm_team_management_rls`** — adds `get_accessible_team_ids()` + scoped write policies (additive; `is_admin()` policies remain) so the existing manage_branch/manage_own/manage_own_team permissions are actually enforced: branch managers write RMs/schedules/teams/members in their branch; team leaders/sales managers manage their own team's membership.
- **019 `profiles_staff_read`** — **discovered gap**: profiles were self+admin only, so managers couldn't see RM NAMES (blank in RM/team/lead/appointment views). Adds scoped SELECT for `rms.view` holders over RMs in their accessible branches. Writes to profiles stay admin-only.

**Verified on LOCAL:** branch manager can update an RM, create a team, add a schedule, add a team member, and read RM names (mig 019); a plain RM is denied (RLS violation). All PostgREST embeds resolve. typecheck/lint pass; routes guard (unauth → /login); `/api/admin/rms` returns 401 unauthenticated.

**✅ COMPLETE:** Migration 019 was REVISED to least-privilege before push — replaced the broad profiles SELECT policy with a `v_staff_directory` VIEW (security_invoker=false) exposing ONLY rm_id + full_name, scoped by `get_accessible_rm_ids()`; self-name always resolves (`OR rm.profile_id = auth.uid()`). Services resolve RM names via `staffNameMap()` (`src/services/staff.ts`) reading that view — NOT profiles embeds. Migrations 018+019 on cloud (verified 9/9 e2e). Committed `dbcb0f9`, [PR #1](https://github.com/policyfynder-ctrl/policyfynder/pull/1).

---

## Milestone 6 — Appointment Management (built local 2026-06-25, branch milestone-6)

**Pages:** `/dashboard/appointments` (list: upcoming default + status filter chips) and `/dashboard/appointments/[id]` (customer+lead, RM, branch, activity timeline, status/reschedule/cancel controls). Server-first; RLS scopes all reads/writes (no admin client).

**Service `src/services/appointments.ts`** (session client only): `listAppointments({status?,upcomingOnly?})`, `getAppointment(id)`, `getAppointmentActivity(id)` (reads activity_logs — needs migration 016 scoped policy), `updateAppointmentStatus(id,status,reason?)`, `rescheduleAppointment(...)`. Reschedule = create new appointment (`rescheduled_from_id`→old, same RM/lead/branch) after `get_slot_availability` RPC check + capacity-trigger backstop, then mark old `rescheduled`; rolls back the new row if the old update fails. Cancel = status→cancelled + cancellation_reason.

**Server actions** `src/app/(dashboard)/appointments/actions.ts`: update status / cancel / reschedule. Gated by `appointments.update` and `appointments.cancel` (UX); RLS is the real gate. Pure helpers `src/lib/appointments.ts`. Components in `src/components/features/appointments/` (AppointmentList, AppointmentStatusBadge, AppointmentStatusForm, CancelForm, RescheduleForm [reuses SlotPicker], AppointmentTimeline). Dashboard widget `UpcomingAppointments` added to landing.

**Two migrations (LOCAL ONLY — cloud push pending approval):**

- **016 `appointment_audit.sql`** — (1) `activity_logs_select_scoped` policy so appointment/lead owners (not just admins) can read their timeline; visibility piggybacks on existing appointment/lead RLS via `entity_id IN (SELECT id FROM …)`. (2) Status trigger now emits specific actions: `appointment.confirmed/completed/cancelled/no_show/rescheduled`.
- **017 `capacity_update_guard.sql`** — **bug fix**: the capacity trigger re-ran on status-only updates and counted the appointment against its own slot → confirm/complete always failed with "No capacity". Now skips the check when slot+RM unchanged. (Pre-existing bug, surfaced by M6; affects cloud too.)

**Verified on LOCAL:** status updates succeed and audit `appointment.confirmed/completed`; reschedule writes `appointment.booked` (new) + `appointment.rescheduled` (old); double-booking a full slot → "No capacity" rejection; scoped timeline read — RM sees own appointment's activity (1 row), stranger sees 0. typecheck/lint pass; routes compile + guard (unauth → /login).

**CLOUD VERIFIED (2026-06-25):** migrations 016+017 pushed to cloud. Status update scheduled→confirmed→completed succeeds (017 fix confirmed) and audits `appointment.booked → appointment.confirmed → appointment.completed` (016 specific actions). Cloud + local at migration parity (001–017). Cloud test appointment `a5f9fec8…` (Cloud Tester) is now status=completed (test data).

---

## Milestone 5 — Lead Management (complete 2026-06-25)

**Pages:** `/dashboard/leads` (`page.tsx`) — list with status filter chips; `/dashboard/leads/[id]` — detail (customer, source, branch, assigned RM, interests, appointment history, status updater). Both server-first.

**Service `src/services/leads.ts`** (server/session client only — NO admin client, NO RLS bypass): `listLeads({status?})`, `getLead(id)`, `updateLeadStatus(id,status)`. RLS scopes everything: RM→assigned, team_leader→team (`get_accessible_rm_ids`), branch/sales_manager→branch (`get_accessible_branch_ids`), super_admin/admin→all. `updateLeadStatus` returns a permission error when RLS matches 0 rows.

**Status update:** server action `src/app/(dashboard)/leads/actions.ts` (`updateLeadStatusAction`) → `updateLeadStatus` → `revalidatePath`. UX-gated by `hasPermission('leads','update')`; RLS is the real gate. Client `LeadStatusForm` (useActionState).

**Pure helpers `src/lib/leads.ts`:** `LEAD_STATUSES`, `LEAD_STATUS_LABELS`, `leadStatusLabel`, `isLeadStatus`, `leadStatusVariant`. Components: `LeadList`, `LeadStatusBadge`, `LeadStatusForm`.

**Migration 015 (`lead_status_activity.sql`):** trigger `log_lead_status_changed` → `activity_logs` action `lead.status_changed` `{from,to}` on every status transition (DB-level → unbypassable). Complements existing `lead_stage_history` trigger. Applied to local AND cloud.

**⚠️ STATUS ENUM NOTE:** requirement asked for New/Contacted/**Qualified**/Proposal Sent/**Won**/Lost, but the DB `lead_status` enum is the FIXED pipeline `new, scheduled, contacted, proposal_sent, converted, lost`. Implemented with the real enum; `converted` is labelled **"Won"**. There is **no "Qualified" state** — adding it needs an enum migration + product sign-off (deferred, flagged to user).

**Verified:** local — status change writes both `lead_stage_history` and `activity_logs` (new→contacted→converted). Cloud — booking lead (`cloudtest@example.com`) visible; PATCH scheduled→contacted produced `activity_logs` `lead.status_changed` + `lead_stage_history` row. typecheck/lint pass; new routes compile + guard (unauth → /login). RBAC enforced by existing RLS (no bypass; admin client not used in leads).

**Cloud note:** during verification the Cloud Tester lead status was changed scheduled→contacted (test data).

---

## Milestone 4 — Public Booking (complete on local 2026-06-25)

**Route:** `src/app/(public)/book/[branch]/page.tsx` (route group `(public)`, no auth). Server component resolves branch by `code` (404 if missing/inactive), fetches upcoming slots + products, renders `BookingForm`.

**Write path:** form → `POST /api/book` (`src/app/api/book/route.ts`) → `createBooking()` in `src/services/booking.ts` using the **admin/service-role client** (needed: `appointments.rm_id` is NOT NULL + must read appointments to avoid double-booking, which anon can't). It picks the **least-busy eligible RM** (covering schedule, not on leave, not booked at that slot, under daily cap), inserts lead (`source='direct'`, source_id, branch_id, status='scheduled', interests) + appointment (rm_id, branch_id, date, start/end, status='scheduled'), returns `confirmation_token`. Orphan lead is deleted if the appointment insert is rejected. Reads (`getBranchByCode`, `getAvailableSlots`, `getActiveProducts`) use the anon server client.

**Components:** `src/components/features/appointments/SlotPicker.tsx` (date-grouped time grid, client), `BookingForm.tsx` (client orchestrator: slot + details + submit + confirmation). Validation in `src/lib/booking/validation.ts` (shared client+server). Public layout `src/app/(public)/layout.tsx`.

**Two schema bugs found & fixed (both via the booking flow):**

1. **Migration 013 (`api_grants.sql`)** — `anon`/`authenticated`/`service_role` had NO SELECT/INSERT grants on local (only TRUNCATE/REFERENCES/TRIGGER). Postgres needs a GRANT _and_ RLS. Supabase Cloud supplies these implicitly (so cloud reads worked); local/vanilla Postgres does not. Added the standard grants + ALTER DEFAULT PRIVILEGES. RLS still gates rows (verified: anon reads branches, gets `[]` for roles).
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

**Date:** 2026-06-26
**What was built:**

- **Milestone 10 (Reports & Analytics)** finished end-to-end: migration 024 (12 scoped `SECURITY DEFINER` reporting functions + 3 indexes) applied local + cloud; `src/services/reports.ts`, `/dashboard/reports` page (date-range + role-gated sections), report components. Nav Reports entry pre-existing.
- Verified local (scope: RM-own / branch-confined / admin-all) and cloud (7/7 e2e). Committed `Milestone 10 - Reports and Analytics`, pushed `milestone-10`, PR #6 (base milestone-9, NOT merged).

**Stopped at:** M10 complete and on cloud; all 6 milestone PRs (#1–#6) open and unmerged.
**Next action:** Await next milestone scope from the user (or merge the PR stack 5→6→7→8→9→10).

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
