# Product Decisions — PolicyFynder

Key choices made while designing PolicyFynder and the reasoning behind them.
Read this before making structural changes — it records what was already considered and why.

---

## Stack

### Next.js 16 App Router

Single-repo for frontend and backend. Server components handle data fetching; layouts handle auth guards. Chose App Router over Pages Router — better server component support, cleaner route grouping with `(auth)/` and `(dashboard)/`.

### Supabase over a custom backend

Auth, database, storage, and RLS out of the box. Row Level Security enforces data isolation at the database level — more reliable than application-layer checks. Supabase is Postgres underneath; switching away is possible if needed.

**Previous plan abandoned:** An earlier design used tRPC + Prisma + Railway. This was replaced with Supabase because it reduces infrastructure surface area and provides RLS natively.

### TypeScript throughout

Supabase auto-generates types from the schema (`npx supabase gen types`). Type errors surface at compile time. No `any` — use `unknown` + type guards where needed.

### Tailwind v4 + ShadCN

Tailwind for styling; ShadCN for accessible, unstyled component primitives. Prettier plugin auto-sorts Tailwind classes.

---

## Database

### Dynamic slot capacity — not hardcoded

Slot availability = active RMs with a matching schedule minus leave minus existing bookings.
Implemented as `get_slot_capacity(date, time, branch_id)` and `get_slot_availability(date, time, branch_id)` PostgreSQL functions.
A `BEFORE INSERT` trigger (`enforce_appointment_capacity`) blocks overbooking at the database level — impossible to bypass from application code.

**Why not hardcode:** The number of RMs changes. Hardcoding forces a schema change every time an RM is added or removed. Dynamic calculation scales from 1 to 100+ RMs without any code change.

### Working hours are config-driven, not hardcoded

Working hours live in `working_hours_config` table. `v_slot_availability` view reads from this table.
Different branches can have different hours, slot durations, and effective dates.

**Previous design abandoned:** The original `v_slot_availability` view hardcoded 9 time slots (10:00–18:00) as a fixed array. This made multi-branch support impossible without a view rewrite.

### Soft deletes everywhere

All core entities (`leads`, `appointments`, `lead_notes`, `teams`) use `deleted_at TIMESTAMPTZ` instead of hard deletes.

**Why:** Insurance records may be needed for compliance. Accidental deletions are recoverable. Activity history survives even for "deleted" leads.

### Money as integers in cents

All premium values stored as integers (e.g. ₹1,200/yr = `120000`). Divide by 100 to display.

**Why:** Floating-point arithmetic has rounding errors. Integers never do. Industry standard for financial data.

### Immutable audit tables

`lead_stage_history` and `activity_logs` are write-once. DB triggers auto-populate both — never insert manually.

**Activity log triggers cover:** lead.created, lead.assigned, appointment.booked, appointment.status_changed, rm.activated, rm.deactivated, role.assigned, role.revoked.

### `activity_logs.metadata` column name

The JSONB column on `activity_logs` is named `metadata` (not `changes`).

**Why this matters:** An earlier version of migration 001 created the column as `changes`. Migration 011 (activity triggers) inserts into `metadata`. If these do not match, all trigger-based log writes fail silently (the helper function has an EXCEPTION handler). The column was standardised to `metadata` to match the documentation and the trigger code. Any future direct inserts should use `metadata`.

### JSONB for extensibility

`leads.metadata` and `notifications.payload` are JSONB. New fields (UTM params, WhatsApp template vars) can be added without schema migrations.

---

## Role & Permission System

### RBAC over hardcoded roles

Roles and permissions live in tables (`roles`, `permissions`, `role_permissions`, `user_roles`), not enums.

**Why:** The original `user_role` enum (`admin | rm | customer`) could not represent Branch Manager, Sales Manager, or Team Leader. Enum values cannot be removed in Postgres, so evolving a hardcoded enum creates migration debt. A table-based RBAC scales to any number of roles without schema changes.

**Backward compat:** `profiles.role` (the original enum column) is retained. New code checks `user_roles` table; `profiles.role` is a legacy hint only.

### Scoped role assignments

A user can hold multiple roles with different scopes:

- `scope_type = 'global'` → applies everywhere (admin, super_admin)
- `scope_type = 'branch'` → applies within that branch only (branch_manager)
- `scope_type = 'team'` → applies within that team only (team_leader)

**Why:** An RM who becomes a Team Leader shouldn't need their original RM role revoked. A Branch Manager in Branch A should not see Branch B data.

### Hierarchy-aware RLS

Three new helper functions in migration 9:

- `has_permission(resource, action)` — permission table lookup
- `get_accessible_branch_ids()` — returns branches the user manages
- `get_accessible_rm_ids()` — returns RMs whose data the user can see

RLS policies use these instead of the binary `is_admin()` / `is_rm()` checks.

---

## Organisational Hierarchy

### teams + team_members

`teams` table belongs to a branch. Each team has a `team_leader_rm_id`.
`team_members` is history-preserving (has `left_at` and `is_current`).

**Why history:** Team membership changes are an audit trail. An RM leaving a team shouldn't delete their contribution history.

---

## Lead Management

### lead_sources as a lookup table

Replaces the hardcoded `lead_source` enum (`instagram | facebook | google | ...`).

**Why:** New ad channels (TikTok, LinkedIn, partner referral) would require a migration to add enum values. A lookup table allows new sources without schema changes. Also stores `cost_per_lead_cents` for ROI analytics.

### Follow-up and SLA on leads

`leads.follow_up_at` — next scheduled contact date.
`leads.sla_deadline_at` — auto-set on lead creation based on source/priority.
`leads.priority` — 1=urgent, 2=high, 3=normal (default), 4=low, 5=deferred.

**Why:** Without these, the CRM cannot answer "who needs to be called today?" — the most basic CRM workflow.

### appointment_in_future constraint removed

The DB-level `CHECK (appointment_date > CURRENT_DATE OR ...)` was removed.

**Why:** Admins need to backfill historical appointments, correct data entry errors, and import past records. The constraint remains in application code for the customer-facing booking form only.

---

## Lead Pipeline

Fixed 5 stages: `new → scheduled → contacted → proposal_sent → converted → lost`

**Why fixed:** Simple enough to understand at a glance. Covers the real insurance sales lifecycle. Custom stages add complexity — deferred until there is clear demand from users.

---

## Auth and Access Control

### Supabase Auth with cookie sessions

Uses `@supabase/ssr` for SSR-compatible sessions. Cookies are refreshed on every request by `src/middleware.ts`.

### Three Supabase clients

- `client.ts` — browser; uses anon key; RLS applies
- `server.ts` — server components and API routes; reads session from cookies; RLS applies
- `middleware.ts` — session refresh only; never queries data directly

**Never use the service role key in components.** Only in `src/app/api/` routes for admin operations.

### Anonymous booking INSERT

INSERT on `leads` and `appointments` is open to anonymous users (no login required).

**Why:** The booking form is public-facing. Requiring signup before booking increases drop-off. Customers can optionally create an account after booking.

### Branch code (URL slug)

`branches.code` is a unique TEXT slug used in public booking URLs: `/book/head-office`.

**Why:** Booking URLs must be human-readable and stable. A UUID URL (`/book/a3f7...`) is error-prone and cannot be printed on marketing materials. The code is set at branch creation and should never be changed once the branch goes live — changing it breaks any bookmarked or shared URLs.

**Rules:** lowercase, hyphen-separated, no spaces. `code` is NULLABLE so branches can be created without a public URL before they are ready to accept bookings.

Seeded value: `'head-office'` for the default branch.

### Anonymous read access for active branches

Anonymous users (the booking page) can `SELECT` from `branches WHERE is_active = true`. Authenticated users can see all branches including inactive ones.

**Why:** The public booking page at `/book/[branch]` must resolve the branch code to an ID without authentication. Restricting this read to authenticated-only users breaks the booking flow before a visitor even sees the form. Limiting anonymous reads to `is_active = true` ensures decommissioned branches are not discoverable through the public API.

---

## Notifications

`notifications` table is a multi-channel queue with `channel` enum: `email | sms | whatsapp | in_app`.

`notification_templates` table stores pre-approved templates with:

- `external_template_id` — the provider's template identifier (required for WhatsApp Business API)
- `required_variables` — payload validation before sending
- `approved_at` — WhatsApp approval timestamp

Retry logic: `retry_count`, `max_retries`, `next_retry_at` on `notifications`. Edge Function worker polls `idx_notifications_retry_queue`.

**Not built yet:** No notification worker exists. Planned as a Supabase Edge Function triggered on a schedule.

---

## Scope Decisions (deferred)

| Feature                | Decision                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Mobile app             | Responsive web first. Native app only if users need it.                                        |
| Payment integration    | Out of scope — booking is free.                                                                |
| Multi-timezone         | All appointments in `Asia/Kolkata`. `working_hours_config` has timezone column planned.        |
| Custom pipeline stages | Deferred until user demand.                                                                    |
| WhatsApp/SMS worker    | Schema ready; worker not built.                                                                |
| Reporting tables       | Deferred — add `daily_lead_summary`, `rm_performance_daily` when analytics dashboard is built. |
| Targets / quotas       | Deferred — `performance_targets` table designed but not built.                                 |
| Data archival          | Deferred — partition `activity_logs` and `notifications` by month when row count exceeds 1M.   |
