# System Design — PolicyFynder

## What PolicyFynder Does

PolicyFynder is a multi-branch insurance CRM. It manages the full lead lifecycle: from customer acquisition through appointment booking, RM consultation, and final policy conversion. A layered organisation of Admins, Branch Managers, Sales Managers, Team Leaders, and Relationship Managers (RMs) operates across one or more physical branches.

---

## How the Pieces Fit Together

```
Browser (Next.js)
    │
    ├── Pages & UI (React components, Tailwind CSS)
    │   ├── Role-conditional navigation (shows only what the user's roles permit)
    │   └── Branch-scoped views (managers see only their branch/team data)
    │
    └── Data Layer
          ├── Supabase Client  ──────► Supabase (hosted Postgres)
          │   (runs in browser)            ├── Database (22 tables + RLS)
          │                                ├── Auth (users + sessions)
          │                                ├── Storage (documents)
          │                                └── Edge Functions (notification worker)
          │
          └── Next.js API Routes ─────► Supabase Admin Client
              (runs on server)             (admin ops, webhook handling)
```

**The short version:** The browser talks directly to Supabase for most operations. RLS (Row Level Security) ensures every user — regardless of role — sees only the data their role and scope allow. For operations requiring elevated access (admin actions, file exports, webhook processing), Next.js API routes use the service role key server-side.

---

## Role Hierarchy

PolicyFynder uses a **scoped RBAC** (role-based access control) system. Every user can hold one or more roles, each scoped to a specific level of the organisation.

```
                    [ Super Admin ]          — global scope; full access
                         │
                    [ Admin ]                — global scope; all ops except system config
                         │
              ┌──────────┴──────────┐
    [ Branch Manager ]       [ Branch Manager ]    — scoped to one branch
              │
    [ Sales Manager ]                        — scoped to one branch
              │
    [ Team Leader ]                          — scoped to one team within a branch
              │
    [ RM ] ─────────────────────────────┐   — scoped to team or branch
                                        │
                                   [ Customer ]    — global; own records only
```

**Key properties:**

- A user can hold multiple roles simultaneously (e.g. an RM who becomes a Team Leader keeps both)
- Roles are stored in the `user_roles` table, not hardcoded in a profiles column
- `scope_type` constrains where the role applies: `global`, `branch`, or `team`
- Permissions are a matrix of `resource × action`, seeded from the `role_permissions` table

---

## Data Isolation Model

Data isolation operates at three levels:

### Level 1 — Supabase Auth

Session tokens identify the logged-in user. Every request carries `auth.uid()`.

### Level 2 — Row Level Security

Every table has RLS enabled. Policies call three RBAC helper functions:

| Function                           | Returns   | Used for                             |
| ---------------------------------- | --------- | ------------------------------------ |
| `has_permission(resource, action)` | `BOOLEAN` | Permission gate for specific actions |
| `get_accessible_branch_ids()`      | `UUID[]`  | Branches the user manages/owns       |
| `get_accessible_rm_ids()`          | `UUID[]`  | RMs whose data the user can see      |

These functions read from `user_roles → role_permissions → permissions` at query time, so permission changes take effect immediately — no session restart needed.

### Level 3 — Application Layer

Server components and API routes check permissions before rendering sensitive UI sections. The `has_permission()` function is callable from the application layer via a service function.

---

## Branch Architecture

A branch is the primary organisational unit. Leads, appointments, and RMs all belong to a branch.

```
Branch
  ├── working_hours_config   — slot schedule (days, times, duration)
  ├── branch_holidays        — date-specific closures
  ├── relationship_managers  — staff assigned to this branch
  │     └── teams            — groups of RMs within the branch
  ├── leads                  — leads that originated at this branch
  └── appointments           — appointments booked at this branch
```

**Branch-aware capacity:** The booking page passes `branch_id` to `get_slot_availability(date, time, branch_id)`. Customers at Branch A never see Branch B's availability, and capacity is calculated using only that branch's RMs and schedule.

---

## How a Typical Request Works

### Customer Books an Appointment (anonymous)

1. Customer opens the public booking page
2. Page calls `v_slot_availability` filtered to the booking branch
3. `v_slot_availability` reads `working_hours_config` and calls `get_slot_availability(date, time, branch_id)` per slot
4. Customer fills the lead form and selects a slot
5. Anonymous INSERT on `leads` + `appointments` — no login required
6. DB trigger fires `enforce_appointment_capacity` — blocks overbooking
7. DB triggers log `lead.created` and `appointment.booked` to `activity_logs`
8. Notification worker (Edge Function) picks up the pending confirmation notification

### RM Views Their Lead List (authenticated)

1. RM opens `/dashboard/leads`
2. Next.js server component queries Supabase using the server client
3. RLS policy `leads_select_rm`: `assigned_rm_id = get_rm_id()`
4. Only leads assigned to this RM are returned
5. Page renders with follow-up dates, SLA indicators, and priority badges

### Branch Manager Views Their Branch (authenticated)

1. Branch Manager opens `/dashboard/branches/[id]/leads`
2. Query hits Supabase — RLS policy `leads_select_hierarchy`
3. `get_accessible_branch_ids()` returns the manager's branch ID
4. `get_accessible_rm_ids()` returns all RMs in that branch
5. All leads where `branch_id = ANY(get_accessible_branch_ids())` are returned
6. Manager sees every lead in their branch, can reassign, update status

---

## Capacity Booking Flow

```
Customer selects a date
        │
        ▼
v_slot_availability (view)
  └─ reads working_hours_config for that branch/day
  └─ calls get_slot_availability(date, slot_start, branch_id) per row
        │
        ▼
get_slot_availability = get_slot_capacity − booked_count
  └─ get_slot_capacity = active RMs with matching rm_schedules, minus rm_leave
        │
        ▼
Customer picks slot → INSERT appointment
        │
        ▼
enforce_appointment_capacity (BEFORE INSERT trigger)
  └─ re-checks get_slot_availability at moment of insert
  └─ RAISES EXCEPTION if 0 slots remain (concurrent booking protection)
        │
        ▼
Booking confirmed
```

---

## Notification Architecture

```
Event occurs (lead created, appointment booked, etc.)
        │
        ▼
Activity log trigger fires (DB) → writes to activity_logs
        │
        ▼
Application code inserts row into notifications
  └─ references notification_templates.id (pre-approved template)
  └─ payload JSON includes required_variables for the template
        │
        ▼
Edge Function (notification-worker) — runs on schedule
  └─ queries notifications WHERE status = 'pending' OR (status = 'failed' AND next_retry_at < NOW())
  └─ sends via channel (WhatsApp Business API / email / SMS)
  └─ updates status, provider_message_id, sent_at
  └─ on failure: increments retry_count, sets next_retry_at, keeps status = 'failed'
  └─ gives up when retry_count >= max_retries
```

---

## Environments

| Environment | Purpose              | Notes                                      |
| ----------- | -------------------- | ------------------------------------------ |
| Local dev   | Building and testing | `localhost:3000`, own Supabase project     |
| Preview     | PR testing           | Auto-created by Vercel                     |
| Production  | Live app             | Separate Supabase project, same migrations |

Migrations are applied in order (000001 → 000011) across all environments.

---

## Migration Strategy

Migrations are numbered and immutable once applied. The current schema is split across 11 files:

| Group             | Files         | Contents                                                  |
| ----------------- | ------------- | --------------------------------------------------------- |
| Foundation        | 000001–000003 | Tables, functions, triggers, base RLS, indexes            |
| RBAC              | 000004        | Roles, permissions, user_roles                            |
| Org Structure     | 000005        | Teams, team_members, branch_id on leads/appointments      |
| Capacity Config   | 000006        | working_hours_config, branch_holidays, config-driven view |
| Lead CRM          | 000007        | lead_sources, lead_follow_ups, new lead columns           |
| Notifications     | 000008        | notification_templates, retry columns                     |
| RLS v2            | 000009        | Hierarchy-aware helper functions + policies               |
| Indexes v2        | 000010        | Indexes for all new tables                                |
| Activity Triggers | 000011        | 6 auto-logging DB triggers                                |
