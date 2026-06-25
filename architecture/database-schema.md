# Database Schema — PolicyFynder

Complete database architecture for a multi-branch insurance CRM with RBAC, capacity-based appointment booking, and full CRM workflow support.

**22 tables. 11 migration files. Schema version: 2.0**

---

## 1. ER Diagram

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                         POLICYFYNDER — ENTITY MODEL v2                              ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

── IDENTITY & ACCESS ──────────────────────────────────────────────────────────────────

  auth.users (Supabase)
      │ 1:1 (trigger → creates profile + customer role)
      ▼
  ┌──────────────┐       ┌──────────────────────────────────────────────────────────┐
  │   profiles   │       │                    RBAC SYSTEM                           │
  │  id, email   │       │                                                          │
  │  full_name   │       │  ┌─────────┐   ┌─────────────────┐   ┌─────────────┐   │
  │  role(legacy)│       │  │  roles  │──►│ role_permissions│◄──│ permissions │   │
  └──────┬───────┘       │  └────┬────┘   └─────────────────┘   └─────────────┘   │
         │               │       │                                                  │
         │               │  ┌────▼──────────────────────────────┐                  │
         │               │  │           user_roles              │                  │
         │               │  │  profile_id, role_id,             │                  │
         │               │  │  scope_type (global/branch/team)  │                  │
         │               │  │  scope_id, expires_at             │                  │
         │               │  └───────────────────────────────────┘                  │
         │               └──────────────────────────────────────────────────────────┘
         │
── ORGANISATION ───────────────────────────────────────────────────────────────────────
         │
         │               ┌──────────────────────────────────────────────┐
         │               │               branches                       │
         │               │  id, name, code, address, timezone           │
         │               └──────┬───────────────────────────────────────┘
         │                      │ 1:M                  │ 1:M
         │                      ▼                      ▼
         │               ┌──────────────┐   ┌──────────────────────┐
         │               │    teams     │   │  working_hours_config│
         │               │  branch_id   │   │  day_of_week         │
         │               │  team_leader │   │  slot_start          │
         │               │  _rm_id      │   │  slot_duration_min   │
         │               └──────┬───────┘   └──────────────────────┘
         │                      │ M:M via team_members
         │                      │               ┌──────────────────────┐
         │                      │               │   branch_holidays    │
         │ 1:1                  ▼               │   branch_id, date    │
         ▼               ┌─────────────────────────────────────────────┐
  ┌──────────────────────┤      relationship_managers                  │
  │                      │  id, profile_id, branch_id, team_id         │
  │                      │  max_daily_appointments, service_areas      │
  │                      └────┬────────────┬──────────────┬────────────┘
  │                           │ 1:M        │ 1:M          │ M:M
  │                           ▼            ▼              ▼
  │                    ┌────────────┐ ┌─────────┐ ┌──────────────────┐
  │                    │rm_schedules│ │rm_leave │ │rm_specializations│
  │                    │(weekly     │ │(date-   │ │(product expertise│
  │                    │ hours/RM)  │ │ specific│ │ per RM)          │
  │                    └────────────┘ │ absence)│ └──────────────────┘
  │                                   └─────────┘         │ M:M
  │                                                        ▼
  │                                               ┌──────────────────┐
  │                                               │insurance_products│
  │                                               └──────────────────┘
── CRM ────────────────────────────────────────────────────────────────────────────────
  │
  │ 1:M (customer)         ┌────────────────┐
  └───────────────────────►│  lead_sources  │
                           │  (lookup table)│
  ┌────────────────────────┘   name, slug   │
  │                           channel_type  │
  │ 1:M                   └────────────────┘
  ▼
  ┌───────────────────────────────────────────────────────────────────────────────────┐
  │                                  leads                                            │
  │  id, customer_profile_id, assigned_rm_id, branch_id                              │
  │  first_name, last_name, email, phone                                             │
  │  status (enum: new→scheduled→contacted→proposal_sent→converted→lost)             │
  │  source (legacy enum), source_id (FK → lead_sources)                             │
  │  priority (1–5), lead_score, follow_up_at, sla_deadline_at                      │
  │  city, state, postal_code, country                                               │
  │  metadata (JSONB), converted_value_cents, deleted_at                             │
  └──┬──────────────┬────────────────────────────────────────────────────────────────┘
     │              │ 1:M to each:
     │              ├────────────────► appointments
     │              ├────────────────► lead_assignments
     │              ├────────────────► lead_notes
     │              ├────────────────► lead_stage_history   (immutable, trigger-fed)
     │              └────────────────► lead_follow_ups      (scheduled follow-up actions)
     │
── APPOINTMENTS ───────────────────────────────────────────────────────────────────────
     │
     ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │                             appointments                                        │
  │  id, lead_id, rm_id, branch_id                                                 │
  │  appointment_date, start_time, end_time                                        │
  │  status, confirmation_token, notes, cancellation_reason                        │
  │  rescheduled_from_id (self-ref)                                                │
  │                                                                                │
  │  Overbooking blocked by BEFORE INSERT trigger → enforce_appointment_capacity   │
  └─────────────────────────────────────────────────────────────────────────────────┘

── AUDIT & NOTIFICATIONS ──────────────────────────────────────────────────────────────

  ┌─────────────────────────────┐    ┌───────────────────────────────────────────┐
  │       activity_logs         │    │              notifications                │
  │  entity_type, entity_id     │    │  recipient_id, type, channel, status      │
  │  action, actor_id, metadata │    │  template_ref_id (FK → notification_      │
  │  (immutable, trigger-fed)   │    │  templates), payload (JSONB)              │
  │                             │    │  retry_count, max_retries, next_retry_at  │
  └─────────────────────────────┘    └───────────────────────────────────────────┘
                                                      │
                                     ┌────────────────▼───────────────────────────┐
                                     │          notification_templates            │
                                     │  name, channel, language                  │
                                     │  external_template_id, required_variables │
                                     │  approved_at (WhatsApp approval)          │
                                     └───────────────────────────────────────────┘
```

---

## 2. Table Definitions

### IDENTITY & ACCESS

---

#### `profiles`

Extends Supabase `auth.users`. Auto-created by trigger on signup.

| Column       | Type          | Constraint          | Default      |
| ------------ | ------------- | ------------------- | ------------ |
| `id`         | `UUID`        | PK, FK → auth.users | —            |
| `role`       | `user_role`   | NOT NULL            | `'customer'` |
| `full_name`  | `TEXT`        | —                   | —            |
| `email`      | `TEXT`        | —                   | —            |
| `phone`      | `TEXT`        | —                   | —            |
| `avatar_url` | `TEXT`        | —                   | —            |
| `created_at` | `TIMESTAMPTZ` | NOT NULL            | `NOW()`      |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL            | `NOW()`      |
| `deleted_at` | `TIMESTAMPTZ` | —                   | `NULL`       |

> `role` is a legacy 3-value enum (`admin | rm | customer`). New code uses `user_roles` table.

---

#### `roles`

Named roles in the RBAC system.

| Column         | Type          | Constraint       | Default             |
| -------------- | ------------- | ---------------- | ------------------- |
| `id`           | `UUID`        | PK               | `gen_random_uuid()` |
| `name`         | `TEXT`        | NOT NULL, UNIQUE | —                   |
| `display_name` | `TEXT`        | NOT NULL         | —                   |
| `description`  | `TEXT`        | —                | —                   |
| `is_system`    | `BOOLEAN`     | NOT NULL         | `true`              |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL         | `NOW()`             |

Seeded roles: `super_admin`, `admin`, `branch_manager`, `sales_manager`, `team_leader`, `rm`, `customer`

---

#### `permissions`

Resource × action permission definitions.

| Column        | Type          | Constraint                   | Default             |
| ------------- | ------------- | ---------------------------- | ------------------- |
| `id`          | `UUID`        | PK                           | `gen_random_uuid()` |
| `resource`    | `TEXT`        | NOT NULL                     | —                   |
| `action`      | `TEXT`        | NOT NULL                     | —                   |
| `description` | `TEXT`        | —                            | —                   |
| `created_at`  | `TIMESTAMPTZ` | NOT NULL                     | `NOW()`             |
| —             | —             | UNIQUE(`resource`, `action`) | —                   |

Resources: `leads`, `appointments`, `rms`, `branches`, `teams`, `reports`, `products`, `notifications`, `settings`

Actions: `view_own`, `view_assigned`, `view_team`, `view_branch`, `view_all`, `create`, `update`, `delete`, `assign`, `manage`

---

#### `role_permissions`

Junction table assigning permissions to roles.

| Column          | Type   | Constraint                       |
| --------------- | ------ | -------------------------------- |
| `role_id`       | `UUID` | PK (composite), FK → roles       |
| `permission_id` | `UUID` | PK (composite), FK → permissions |

---

#### `user_roles`

Scoped role assignments per user. One user can hold multiple roles at different scopes.

| Column       | Type          | Constraint                                    | Default             |
| ------------ | ------------- | --------------------------------------------- | ------------------- |
| `id`         | `UUID`        | PK                                            | `gen_random_uuid()` |
| `profile_id` | `UUID`        | NOT NULL, FK → profiles                       | —                   |
| `role_id`    | `UUID`        | NOT NULL, FK → roles                          | —                   |
| `scope_type` | `TEXT`        | NOT NULL, CHECK IN (`global`,`branch`,`team`) | `'global'`          |
| `scope_id`   | `UUID`        | required when scope_type ≠ `global`           | `NULL`              |
| `granted_by` | `UUID`        | FK → profiles                                 | `NULL`              |
| `granted_at` | `TIMESTAMPTZ` | NOT NULL                                      | `NOW()`             |
| `expires_at` | `TIMESTAMPTZ` | —                                             | `NULL`              |

> CONSTRAINT: `scope_type = 'global'` requires `scope_id IS NULL`; other scope types require `scope_id IS NOT NULL`.

---

### ORGANISATION

---

#### `branches`

Physical locations. All capacity, leads, and RMs are scoped to a branch.

| Column       | Type          | Constraint | Default             |
| ------------ | ------------- | ---------- | ------------------- |
| `id`         | `UUID`        | PK         | `gen_random_uuid()` |
| `name`       | `TEXT`        | NOT NULL   | —                   |
| `code`       | `TEXT`        | UNIQUE     | —                   |
| `address`    | `TEXT`        | —          | —                   |
| `timezone`   | `TEXT`        | NOT NULL   | `'Asia/Kolkata'`    |
| `is_active`  | `BOOLEAN`     | NOT NULL   | `true`              |
| `created_at` | `TIMESTAMPTZ` | NOT NULL   | `NOW()`             |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL   | `NOW()`             |

> `code` is the URL slug used in the public booking page: `/book/head-office`. Set at creation; never change after a branch goes live (URLs would break). Seeded value for Head Office: `'head-office'`.

---

#### `teams`

Groups of RMs within a branch. Each team has one Team Leader.

| Column              | Type          | Constraint                  | Default             |
| ------------------- | ------------- | --------------------------- | ------------------- |
| `id`                | `UUID`        | PK                          | `gen_random_uuid()` |
| `branch_id`         | `UUID`        | NOT NULL, FK → branches     | —                   |
| `name`              | `TEXT`        | NOT NULL                    | —                   |
| `team_leader_rm_id` | `UUID`        | FK → relationship_managers  | `NULL`              |
| `description`       | `TEXT`        | —                           | —                   |
| `is_active`         | `BOOLEAN`     | NOT NULL                    | `true`              |
| `created_at`        | `TIMESTAMPTZ` | NOT NULL                    | `NOW()`             |
| `updated_at`        | `TIMESTAMPTZ` | NOT NULL                    | `NOW()`             |
| `deleted_at`        | `TIMESTAMPTZ` | —                           | `NULL`              |
| —                   | —             | UNIQUE(`branch_id`, `name`) | —                   |

---

#### `team_members`

History-preserving team membership. Records when RMs join and leave teams.

| Column       | Type          | Constraint                           | Default             |
| ------------ | ------------- | ------------------------------------ | ------------------- |
| `id`         | `UUID`        | PK                                   | `gen_random_uuid()` |
| `team_id`    | `UUID`        | NOT NULL, FK → teams                 | —                   |
| `rm_id`      | `UUID`        | NOT NULL, FK → relationship_managers | —                   |
| `joined_at`  | `TIMESTAMPTZ` | NOT NULL                             | `NOW()`             |
| `left_at`    | `TIMESTAMPTZ` | —                                    | `NULL`              |
| `is_current` | `BOOLEAN`     | NOT NULL                             | `true`              |

> UNIQUE INDEX on `(rm_id) WHERE is_current = true AND left_at IS NULL` — one active team per RM.

---

#### `working_hours_config`

Defines available booking slots per branch and day. Replaces hardcoded view arrays.

| Column                  | Type          | Constraint            | Default                 |
| ----------------------- | ------------- | --------------------- | ----------------------- |
| `id`                    | `UUID`        | PK                    | `gen_random_uuid()`     |
| `branch_id`             | `UUID`        | FK → branches         | `NULL` (= all branches) |
| `day_of_week`           | `SMALLINT`    | NOT NULL, CHECK (0–6) | —                       |
| `slot_start`            | `TIME`        | NOT NULL              | —                       |
| `slot_duration_minutes` | `SMALLINT`    | NOT NULL, CHECK (> 0) | `60`                    |
| `effective_from`        | `DATE`        | NOT NULL              | `CURRENT_DATE`          |
| `effective_until`       | `DATE`        | —                     | `NULL`                  |
| `is_active`             | `BOOLEAN`     | NOT NULL              | `true`                  |
| `created_at`            | `TIMESTAMPTZ` | NOT NULL              | `NOW()`                 |

> `branch_id = NULL` means "global default". Branch-specific rows override the global default.

---

#### `branch_holidays`

Date-specific branch closures. Suppresses slots from `v_slot_availability` for that date.

| Column         | Type          | Constraint                          | Default                 |
| -------------- | ------------- | ----------------------------------- | ----------------------- |
| `id`           | `UUID`        | PK                                  | `gen_random_uuid()`     |
| `branch_id`    | `UUID`        | FK → branches                       | `NULL` (= all branches) |
| `holiday_date` | `DATE`        | NOT NULL                            | —                       |
| `name`         | `TEXT`        | NOT NULL                            | —                       |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL                            | `NOW()`                 |
| —              | —             | UNIQUE(`branch_id`, `holiday_date`) | —                       |

---

### STAFF

---

#### `relationship_managers`

One record per RM user. Links a profile to a branch and team.

| Column                   | Type          | Constraint                      | Default             |
| ------------------------ | ------------- | ------------------------------- | ------------------- |
| `id`                     | `UUID`        | PK                              | `gen_random_uuid()` |
| `profile_id`             | `UUID`        | NOT NULL, UNIQUE, FK → profiles | —                   |
| `branch_id`              | `UUID`        | FK → branches                   | `NULL`              |
| `team_id`                | `UUID`        | FK → teams                      | `NULL`              |
| `employee_id`            | `TEXT`        | UNIQUE                          | `NULL`              |
| `is_active`              | `BOOLEAN`     | NOT NULL                        | `true`              |
| `max_daily_appointments` | `INTEGER`     | NOT NULL                        | `8`                 |
| `service_areas`          | `TEXT[]`      | NOT NULL                        | `'{}'`              |
| `created_at`             | `TIMESTAMPTZ` | NOT NULL                        | `NOW()`             |
| `updated_at`             | `TIMESTAMPTZ` | NOT NULL                        | `NOW()`             |
| `deleted_at`             | `TIMESTAMPTZ` | —                               | `NULL`              |

> `service_areas`: array of postal codes or city slugs for geographic lead routing.

---

#### `rm_specializations`

M:M — which insurance products each RM specialises in.

| Column       | Type          | Constraint                                 |
| ------------ | ------------- | ------------------------------------------ |
| `rm_id`      | `UUID`        | PK (composite), FK → relationship_managers |
| `product_id` | `UUID`        | PK (composite), FK → insurance_products    |
| `created_at` | `TIMESTAMPTZ` | NOT NULL                                   |

---

#### `rm_schedules`

Weekly recurring availability per RM.

| Column            | Type          | Constraint                           | Default             |
| ----------------- | ------------- | ------------------------------------ | ------------------- |
| `id`              | `UUID`        | PK                                   | `gen_random_uuid()` |
| `rm_id`           | `UUID`        | NOT NULL, FK → relationship_managers | —                   |
| `day_of_week`     | `SMALLINT`    | NOT NULL, CHECK (0–6)                | —                   |
| `start_time`      | `TIME`        | NOT NULL                             | —                   |
| `end_time`        | `TIME`        | NOT NULL                             | —                   |
| `is_active`       | `BOOLEAN`     | NOT NULL                             | `true`              |
| `effective_from`  | `DATE`        | NOT NULL                             | `CURRENT_DATE`      |
| `effective_until` | `DATE`        | —                                    | `NULL`              |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL                             | `NOW()`             |

---

#### `rm_leave`

Date-specific unavailability. Overrides `rm_schedules` for specific dates.

| Column        | Type          | Constraint                           | Default             |
| ------------- | ------------- | ------------------------------------ | ------------------- |
| `id`          | `UUID`        | PK                                   | `gen_random_uuid()` |
| `rm_id`       | `UUID`        | NOT NULL, FK → relationship_managers | —                   |
| `leave_date`  | `DATE`        | NOT NULL                             | —                   |
| `leave_type`  | `leave_type`  | NOT NULL                             | `'full_day'`        |
| `start_time`  | `TIME`        | —                                    | `NULL`              |
| `end_time`    | `TIME`        | —                                    | `NULL`              |
| `reason`      | `TEXT`        | —                                    | —                   |
| `approved_by` | `UUID`        | FK → profiles                        | `NULL`              |
| `created_at`  | `TIMESTAMPTZ` | NOT NULL                             | `NOW()`             |

> Use `leave_type = 'custom'` with `start_time`/`end_time` for partial-day leave. `morning` and `afternoon` values are deprecated.

---

### PRODUCTS

---

#### `insurance_products`

Catalog of insurance products. Enables specialist routing via `rm_specializations`.

| Column        | Type          | Constraint       | Default             |
| ------------- | ------------- | ---------------- | ------------------- |
| `id`          | `UUID`        | PK               | `gen_random_uuid()` |
| `name`        | `TEXT`        | NOT NULL, UNIQUE | —                   |
| `slug`        | `TEXT`        | NOT NULL, UNIQUE | —                   |
| `description` | `TEXT`        | —                | —                   |
| `is_active`   | `BOOLEAN`     | NOT NULL         | `true`              |
| `created_at`  | `TIMESTAMPTZ` | NOT NULL         | `NOW()`             |

Seeded: Auto, Home, Life, Health, Commercial

---

### CRM

---

#### `lead_sources`

Lookup table for lead origin channels. Replaces the hardcoded `lead_source` enum.

| Column                | Type          | Constraint                                                      | Default             |
| --------------------- | ------------- | --------------------------------------------------------------- | ------------------- |
| `id`                  | `UUID`        | PK                                                              | `gen_random_uuid()` |
| `name`                | `TEXT`        | NOT NULL, UNIQUE                                                | —                   |
| `slug`                | `TEXT`        | NOT NULL, UNIQUE                                                | —                   |
| `channel_type`        | `TEXT`        | CHECK (`social`,`search`,`organic`,`referral`,`direct`,`other`) | —                   |
| `cost_per_lead_cents` | `INTEGER`     | NOT NULL                                                        | `0`                 |
| `is_active`           | `BOOLEAN`     | NOT NULL                                                        | `true`              |
| `created_at`          | `TIMESTAMPTZ` | NOT NULL                                                        | `NOW()`             |
| `updated_at`          | `TIMESTAMPTZ` | NOT NULL                                                        | `NOW()`             |

Seeded: Instagram (social), Facebook (social), Google (search), Direct, Referral, Other

---

#### `leads`

Core CRM entity. Every inbound customer inquiry creates a lead.

| Column                  | Type          | Constraint                 | Default             |
| ----------------------- | ------------- | -------------------------- | ------------------- |
| `id`                    | `UUID`        | PK                         | `gen_random_uuid()` |
| `customer_profile_id`   | `UUID`        | FK → profiles              | `NULL`              |
| `assigned_rm_id`        | `UUID`        | FK → relationship_managers | `NULL`              |
| `branch_id`             | `UUID`        | FK → branches              | `NULL`              |
| `first_name`            | `TEXT`        | NOT NULL                   | —                   |
| `last_name`             | `TEXT`        | NOT NULL                   | —                   |
| `email`                 | `TEXT`        | NOT NULL                   | —                   |
| `phone`                 | `TEXT`        | NOT NULL                   | —                   |
| `status`                | `lead_status` | NOT NULL                   | `'new'`             |
| `source`                | `lead_source` | NOT NULL                   | —                   |
| `source_id`             | `UUID`        | FK → lead_sources          | `NULL`              |
| `source_campaign`       | `TEXT`        | —                          | `NULL`              |
| `source_medium`         | `TEXT`        | —                          | `NULL`              |
| `source_content`        | `TEXT`        | —                          | `NULL`              |
| `insurance_interest`    | `TEXT[]`      | —                          | `'{}'`              |
| `priority`              | `SMALLINT`    | NOT NULL, CHECK (1–5)      | `3`                 |
| `lead_score`            | `INTEGER`     | NOT NULL                   | `0`                 |
| `follow_up_at`          | `TIMESTAMPTZ` | —                          | `NULL`              |
| `sla_deadline_at`       | `TIMESTAMPTZ` | —                          | `NULL`              |
| `city`                  | `TEXT`        | —                          | `NULL`              |
| `state`                 | `TEXT`        | —                          | `NULL`              |
| `postal_code`           | `TEXT`        | —                          | `NULL`              |
| `country`               | `TEXT`        | NOT NULL                   | `'IN'`              |
| `lost_reason`           | `TEXT`        | —                          | `NULL`              |
| `converted_value_cents` | `INTEGER`     | —                          | `NULL`              |
| `metadata`              | `JSONB`       | —                          | `'{}'`              |
| `created_at`            | `TIMESTAMPTZ` | NOT NULL                   | `NOW()`             |
| `updated_at`            | `TIMESTAMPTZ` | NOT NULL                   | `NOW()`             |
| `deleted_at`            | `TIMESTAMPTZ` | —                          | `NULL`              |

> `priority`: 1=urgent, 2=high, 3=normal, 4=low, 5=deferred
> `source` is the legacy enum column; `source_id` is the FK to `lead_sources` (new)
> `metadata` JSONB absorbs future fields without migrations

---

#### `appointments`

A booking of one RM for one lead at a specific date/time slot.

| Column                | Type                 | Constraint                           | Default             |
| --------------------- | -------------------- | ------------------------------------ | ------------------- |
| `id`                  | `UUID`               | PK                                   | `gen_random_uuid()` |
| `lead_id`             | `UUID`               | NOT NULL, FK → leads                 | —                   |
| `rm_id`               | `UUID`               | NOT NULL, FK → relationship_managers | —                   |
| `branch_id`           | `UUID`               | FK → branches                        | `NULL`              |
| `appointment_date`    | `DATE`               | NOT NULL                             | —                   |
| `start_time`          | `TIME`               | NOT NULL                             | —                   |
| `end_time`            | `TIME`               | NOT NULL                             | —                   |
| `status`              | `appointment_status` | NOT NULL                             | `'scheduled'`       |
| `confirmation_token`  | `TEXT`               | UNIQUE                               | `NULL`              |
| `notes`               | `TEXT`               | —                                    | `NULL`              |
| `cancellation_reason` | `TEXT`               | —                                    | `NULL`              |
| `rescheduled_from_id` | `UUID`               | FK → appointments                    | `NULL`              |
| `created_at`          | `TIMESTAMPTZ`        | NOT NULL                             | `NOW()`             |
| `updated_at`          | `TIMESTAMPTZ`        | NOT NULL                             | `NOW()`             |
| `deleted_at`          | `TIMESTAMPTZ`        | —                                    | `NULL`              |

> `branch_id` is denormalised from the RM's branch for efficient branch-level reporting.
> No `appointment_in_future` constraint — admin can backfill historical records. Booking form enforces future-only in application code.

---

#### `lead_assignments`

Full history of every lead assignment. Populated by DB trigger on `leads.assigned_rm_id` changes.

| Column          | Type                | Constraint                           | Default             |
| --------------- | ------------------- | ------------------------------------ | ------------------- |
| `id`            | `UUID`              | PK                                   | `gen_random_uuid()` |
| `lead_id`       | `UUID`              | NOT NULL, FK → leads                 | —                   |
| `rm_id`         | `UUID`              | NOT NULL, FK → relationship_managers | —                   |
| `assigned_by`   | `UUID`              | FK → profiles                        | `NULL`              |
| `method`        | `assignment_method` | NOT NULL                             | `'manual'`          |
| `is_current`    | `BOOLEAN`           | NOT NULL                             | `true`              |
| `notes`         | `TEXT`              | —                                    | `NULL`              |
| `assigned_at`   | `TIMESTAMPTZ`       | NOT NULL                             | `NOW()`             |
| `unassigned_at` | `TIMESTAMPTZ`       | —                                    | `NULL`              |

---

#### `lead_notes`

Notes, calls, and meeting records attached to a lead.

| Column       | Type          | Constraint              | Default             |
| ------------ | ------------- | ----------------------- | ------------------- |
| `id`         | `UUID`        | PK                      | `gen_random_uuid()` |
| `lead_id`    | `UUID`        | NOT NULL, FK → leads    | —                   |
| `author_id`  | `UUID`        | NOT NULL, FK → profiles | —                   |
| `note_type`  | `note_type`   | NOT NULL                | `'general'`         |
| `content`    | `TEXT`        | NOT NULL                | —                   |
| `created_at` | `TIMESTAMPTZ` | NOT NULL                | `NOW()`             |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL                | `NOW()`             |
| `deleted_at` | `TIMESTAMPTZ` | —                       | `NULL`              |

---

#### `lead_follow_ups`

Scheduled follow-up actions. Drives the RM daily task queue.

| Column         | Type          | Constraint                           | Default             |
| -------------- | ------------- | ------------------------------------ | ------------------- |
| `id`           | `UUID`        | PK                                   | `gen_random_uuid()` |
| `lead_id`      | `UUID`        | NOT NULL, FK → leads                 | —                   |
| `rm_id`        | `UUID`        | NOT NULL, FK → relationship_managers | —                   |
| `scheduled_at` | `TIMESTAMPTZ` | NOT NULL                             | —                   |
| `completed_at` | `TIMESTAMPTZ` | —                                    | `NULL`              |
| `note`         | `TEXT`        | —                                    | —                   |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL                             | `NOW()`             |
| `updated_at`   | `TIMESTAMPTZ` | NOT NULL                             | `NOW()`             |

---

#### `lead_stage_history`

Immutable record of every status change. Auto-populated by DB trigger.

| Column       | Type          | Constraint           | Default             |
| ------------ | ------------- | -------------------- | ------------------- |
| `id`         | `UUID`        | PK                   | `gen_random_uuid()` |
| `lead_id`    | `UUID`        | NOT NULL, FK → leads | —                   |
| `from_stage` | `lead_status` | —                    | `NULL`              |
| `to_stage`   | `lead_status` | NOT NULL             | —                   |
| `changed_by` | `UUID`        | FK → profiles        | `NULL`              |
| `reason`     | `TEXT`        | —                    | `NULL`              |
| `created_at` | `TIMESTAMPTZ` | NOT NULL             | `NOW()`             |

---

### NOTIFICATIONS

---

#### `notification_templates`

Pre-approved message templates for each channel. WhatsApp Business API requires registered templates.

| Column                 | Type                   | Constraint                            | Default             |
| ---------------------- | ---------------------- | ------------------------------------- | ------------------- |
| `id`                   | `UUID`                 | PK                                    | `gen_random_uuid()` |
| `name`                 | `TEXT`                 | NOT NULL                              | —                   |
| `channel`              | `notification_channel` | NOT NULL                              | —                   |
| `language`             | `TEXT`                 | NOT NULL                              | `'en'`              |
| `external_template_id` | `TEXT`                 | —                                     | `NULL`              |
| `subject`              | `TEXT`                 | —                                     | `NULL`              |
| `body_preview`         | `TEXT`                 | NOT NULL                              | —                   |
| `required_variables`   | `TEXT[]`               | NOT NULL                              | `'{}'`              |
| `is_active`            | `BOOLEAN`              | NOT NULL                              | `true`              |
| `approved_at`          | `TIMESTAMPTZ`          | —                                     | `NULL`              |
| `created_at`           | `TIMESTAMPTZ`          | NOT NULL                              | `NOW()`             |
| `updated_at`           | `TIMESTAMPTZ`          | NOT NULL                              | `NOW()`             |
| —                      | —                      | UNIQUE(`name`, `channel`, `language`) | —                   |

---

#### `notifications`

Multi-channel notification queue with retry support.

| Column                | Type                   | Constraint                  | Default             |
| --------------------- | ---------------------- | --------------------------- | ------------------- |
| `id`                  | `UUID`                 | PK                          | `gen_random_uuid()` |
| `recipient_id`        | `UUID`                 | NOT NULL, FK → profiles     | —                   |
| `lead_id`             | `UUID`                 | FK → leads                  | `NULL`              |
| `appointment_id`      | `UUID`                 | FK → appointments           | `NULL`              |
| `type`                | `notification_type`    | NOT NULL                    | —                   |
| `channel`             | `notification_channel` | NOT NULL                    | `'email'`           |
| `status`              | `notification_status`  | NOT NULL                    | `'pending'`         |
| `template_id`         | `TEXT`                 | —                           | `NULL`              |
| `template_ref_id`     | `UUID`                 | FK → notification_templates | `NULL`              |
| `payload`             | `JSONB`                | NOT NULL                    | `'{}'`              |
| `retry_count`         | `SMALLINT`             | NOT NULL                    | `0`                 |
| `max_retries`         | `SMALLINT`             | NOT NULL                    | `3`                 |
| `next_retry_at`       | `TIMESTAMPTZ`          | —                           | `NULL`              |
| `provider_message_id` | `TEXT`                 | —                           | `NULL`              |
| `scheduled_at`        | `TIMESTAMPTZ`          | NOT NULL                    | `NOW()`             |
| `sent_at`             | `TIMESTAMPTZ`          | —                           | `NULL`              |
| `error_message`       | `TEXT`                 | —                           | `NULL`              |
| `created_at`          | `TIMESTAMPTZ`          | NOT NULL                    | `NOW()`             |

---

### AUDIT

---

#### `activity_logs`

Immutable system-wide audit trail. Auto-populated by DB triggers for all critical events.

| Column        | Type          | Constraint    | Default             |
| ------------- | ------------- | ------------- | ------------------- |
| `id`          | `UUID`        | PK            | `gen_random_uuid()` |
| `actor_id`    | `UUID`        | FK → profiles | `NULL`              |
| `entity_type` | `TEXT`        | NOT NULL      | —                   |
| `entity_id`   | `UUID`        | NOT NULL      | —                   |
| `action`      | `TEXT`        | NOT NULL      | —                   |
| `metadata`    | `JSONB`       | —             | `NULL`              |
| `ip_address`  | `INET`        | —             | `NULL`              |
| `user_agent`  | `TEXT`        | —             | `NULL`              |
| `created_at`  | `TIMESTAMPTZ` | NOT NULL      | `NOW()`             |

Auto-logged events (via DB triggers):

- `lead.created` — on INSERT to `leads`
- `lead.assigned` — on `leads.assigned_rm_id` change
- `appointment.booked` — on INSERT to `appointments`
- `appointment.status_changed` — on `appointments.status` change
- `rm.activated` / `rm.deactivated` — on `relationship_managers.is_active` change
- `role.assigned` / `role.revoked` — on INSERT/DELETE to `user_roles`

---

## 3. Relationships

### One-to-One

| Left         | Right                   | Via                             |
| ------------ | ----------------------- | ------------------------------- |
| `auth.users` | `profiles`              | `profiles.id` (trigger-created) |
| `profiles`   | `relationship_managers` | `rm.profile_id`                 |

### One-to-Many

| Parent                   | Child                   | Via                              |
| ------------------------ | ----------------------- | -------------------------------- |
| `branches`               | `relationship_managers` | `rm.branch_id`                   |
| `branches`               | `teams`                 | `teams.branch_id`                |
| `branches`               | `working_hours_config`  | `config.branch_id`               |
| `branches`               | `branch_holidays`       | `holidays.branch_id`             |
| `branches`               | `leads`                 | `leads.branch_id`                |
| `branches`               | `appointments`          | `appointments.branch_id`         |
| `teams`                  | `team_members`          | `team_members.team_id`           |
| `relationship_managers`  | `team_members`          | `team_members.rm_id`             |
| `relationship_managers`  | `rm_schedules`          | `rm_schedules.rm_id`             |
| `relationship_managers`  | `rm_leave`              | `rm_leave.rm_id`                 |
| `relationship_managers`  | `appointments`          | `appointments.rm_id`             |
| `relationship_managers`  | `leads`                 | `leads.assigned_rm_id`           |
| `profiles`               | `leads`                 | `leads.customer_profile_id`      |
| `profiles`               | `user_roles`            | `user_roles.profile_id`          |
| `roles`                  | `user_roles`            | `user_roles.role_id`             |
| `lead_sources`           | `leads`                 | `leads.source_id`                |
| `leads`                  | `appointments`          | `appointments.lead_id`           |
| `leads`                  | `lead_assignments`      | `lead_assignments.lead_id`       |
| `leads`                  | `lead_notes`            | `lead_notes.lead_id`             |
| `leads`                  | `lead_stage_history`    | `lead_stage_history.lead_id`     |
| `leads`                  | `lead_follow_ups`       | `lead_follow_ups.lead_id`        |
| `notification_templates` | `notifications`         | `notifications.template_ref_id`  |
| `appointments`           | `appointments`          | `rescheduled_from_id` (self-ref) |

### Many-to-Many

| Left                    | Right                | Junction             |
| ----------------------- | -------------------- | -------------------- |
| `relationship_managers` | `insurance_products` | `rm_specializations` |
| `profiles`              | `roles`              | `user_roles`         |

---

## 4. RBAC Strategy

### How permissions are checked

Four DB helper functions (all `SECURITY DEFINER STABLE`):

```
has_permission(resource TEXT, action TEXT) → BOOLEAN
  Joins user_roles → role_permissions → permissions for auth.uid()
  Returns true if any non-expired role assignment grants this permission

get_user_permissions() → TEXT[]                         (migration 012)
  Bulk companion to has_permission(). Returns every "resource.action"
  string granted to auth.uid() across all non-expired role assignments,
  sorted, distinct. Same join + same expiry logic as has_permission(), so
  the two always agree: has_permission(r,a) ⇔ 'r.a' = ANY(get_user_permissions()).
  Ignores scope (like has_permission). Consumed by lib/nav.ts → buildNavItems()
  to render the role-aware sidebar with a single RPC instead of one call per item.
  GRANT EXECUTE TO authenticated. Example output for a customer:
    {appointments.create, appointments.view_own, leads.create,
     leads.view_own, notifications.view_own}

get_accessible_branch_ids() → UUID[]
  Returns branch UUIDs the current user manages:
    • global scope (admin/super_admin) → all branches
    • branch scope (branch_manager/sales_manager) → their specific branch

get_accessible_rm_ids() → UUID[]
  Returns RM UUIDs whose data the user can see:
    • RMs in accessible branches (from get_accessible_branch_ids)
    • RMs in teams where user has team-scoped role (team_leader/sales_manager)
    • The user's own RM record
```

### RLS Access Matrix (v2)

| Table                    | Super Admin / Admin | Branch Manager     | Sales Manager    | Team Leader | RM              | Customer | Anonymous     |
| ------------------------ | ------------------- | ------------------ | ---------------- | ----------- | --------------- | -------- | ------------- |
| `profiles`               | All                 | Own                | Own              | Own         | Own             | Own      | —             |
| `roles`                  | All                 | Read               | Read             | Read        | Read            | Read     | —             |
| `permissions`            | All                 | Read               | Read             | Read        | Read            | Read     | —             |
| `user_roles`             | All                 | Read(branch scope) | Read(team scope) | Own         | Own             | Own      | —             |
| `branches`               | All                 | Read               | Read             | Read        | Read            | —        | Read (active) |
| `teams`                  | All                 | Branch scope       | Own team         | Own team    | Own team        | —        | —             |
| `team_members`           | All                 | Branch scope       | Own team         | Own team    | Own             | —        | —             |
| `working_hours_config`   | All                 | Read               | Read             | Read        | Read            | —        | Read          |
| `branch_holidays`        | All                 | Read               | Read             | Read        | Read            | —        | Read          |
| `lead_sources`           | All                 | Read               | Read             | Read        | Read            | —        | Read (active) |
| `relationship_managers`  | All                 | Branch scope       | Team scope       | Team scope  | Own             | —        | Read (active) |
| `rm_schedules`           | All                 | Read               | Read             | Read        | Own             | —        | Read          |
| `rm_leave`               | All                 | Branch scope       | Team scope       | Team scope  | Own             | —        | —             |
| `leads`                  | All                 | Branch scope       | Team scope       | Team scope  | Assigned        | Own      | Insert        |
| `appointments`           | All                 | Branch scope       | Team scope       | Team scope  | Assigned        | Own      | Insert        |
| `lead_assignments`       | All                 | Branch scope       | Team scope       | Team scope  | Own             | —        | —             |
| `lead_notes`             | All                 | Branch scope       | Team scope       | Team scope  | Assigned lead   | —        | —             |
| `lead_follow_ups`        | All                 | Branch scope       | Team scope       | Own         | Own             | —        | —             |
| `lead_stage_history`     | Read all            | Branch scope       | Team scope       | Team scope  | Assigned (read) | —        | —             |
| `notifications`          | All                 | Branch scope       | Team scope       | Own         | Own             | Own      | —             |
| `notification_templates` | All                 | Read               | Read             | Read        | Read            | —        | —             |
| `activity_logs`          | Read all            | Branch scope       | Team scope       | Team scope  | —               | —        | —             |

> "Branch scope" = `branch_id = ANY(get_accessible_branch_ids())`
> "Team scope" = `assigned_rm_id = ANY(get_accessible_rm_ids())`
> "Read (active)" on `branches` = two-policy pattern: anonymous users see `is_active = true` rows only; authenticated users see all rows. The booking page at `/book/[branch]` resolves a branch by `code` without authentication — this policy makes that possible.

---

## 5. Capacity Calculation Design (v2)

### The Core Problem

Slot availability is dynamic. For a given `(date, time, branch_id)` it equals the count of RMs who are:

1. Active (`is_active = true`) and assigned to that branch
2. Scheduled to work that day/hour (`rm_schedules`)
3. Not on leave (`rm_leave`)
4. Not already booked for that slot (`appointments`)

### Slot Generation

`v_slot_availability` is now config-driven, not hardcoded:

```sql
v_slot_availability
  SELECT slot_date, slot_start, slot_end, branch_id, total_capacity, available_spots
  FROM generate_series(TODAY, TODAY + 29 days)
  JOIN working_hours_config ON day_of_week matches AND is_active = true
  WHERE no branch_holiday exists for that date
  -- calls get_slot_capacity() and get_slot_availability() per row
```

Changing working hours now requires only a `working_hours_config` row update — no migration, no view rewrite.

### Capacity Functions

Both functions accept an optional `p_branch_id` (defaults to `NULL` = all branches):

```
get_slot_capacity(p_date DATE, p_start_time TIME, p_branch_id UUID = NULL) → INTEGER
  COUNT of active RMs in p_branch_id who have a matching rm_schedules row
  minus RMs with a blocking rm_leave row

get_slot_availability(p_date DATE, p_start_time TIME, p_branch_id UUID = NULL) → INTEGER
  GREATEST(0, get_slot_capacity(...) − count of active appointments at that slot)
```

### Overbooking Prevention

`enforce_appointment_capacity` is a `BEFORE INSERT` trigger on `appointments`. It calls `get_slot_availability(date, time, branch_id)` at the moment of insert. If the result is `<= 0`, the insert is rejected with a clear error. This runs at the DB level — the application cannot bypass it.

### Scaling

| Active RMs | Capacity per 60-min slot | Max daily bookings (8h day) |
| ---------- | ------------------------ | --------------------------- |
| 1          | 1                        | 8                           |
| 10         | 10                       | 80                          |
| 50         | 50                       | 400                         |
| 100        | 100                      | 800                         |

No schema changes needed — capacity scales automatically with RM count.

---

## 6. CRM Workflow Design

### Lead Priority and SLA

| Priority | Label            | Intended SLA            |
| -------- | ---------------- | ----------------------- |
| 1        | Urgent           | Contact within 1 hour   |
| 2        | High             | Contact within 4 hours  |
| 3        | Normal (default) | Contact within 24 hours |
| 4        | Low              | Contact within 3 days   |
| 5        | Deferred         | No SLA                  |

`sla_deadline_at` is set by the application when the lead is created (based on source and priority). The RM daily task queue is ordered by `priority ASC, sla_deadline_at ASC`.

### Follow-up Queue

`lead_follow_ups` drives the "Today's Tasks" view for each RM:

- Sorted by `scheduled_at ASC WHERE completed_at IS NULL`
- Overdue items (scheduled_at < NOW) surface first
- Completing a follow-up sets `completed_at` and optionally updates `leads.follow_up_at`

### Assignment Methods

| Method        | When to use                                               |
| ------------- | --------------------------------------------------------- |
| `manual`      | Admin or Team Leader manually assigns (default)           |
| `round_robin` | Rotate through active RMs in the team                     |
| `least_busy`  | RM with fewest open leads                                 |
| `specialist`  | Match RM specializations to `insurance_interest`          |
| `geographic`  | Match RM `service_areas` to lead's `postal_code` / `city` |
| `system`      | Automated (trigger-assigned)                              |

---

## 7. Migration Plan

All 11 migration files in `supabase/migrations/`. Run in order.

| File                                        | Group         | Contents                                                                                                  |
| ------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `20260625000001_initial_schema.sql`         | Foundation    | Enums, 14 tables, all triggers and DB functions, v_slot_availability, seeds                               |
| `20260625000002_rls_policies.sql`           | Foundation    | Base RLS — is_admin(), is_rm(), get_rm_id() helpers + all base policies                                   |
| `20260625000003_indexes.sql`                | Foundation    | Core performance indexes                                                                                  |
| `20260625000004_role_system.sql`            | RBAC          | roles, permissions, role_permissions, user_roles; seeded roles + permission matrix                        |
| `20260625000005_org_structure.sql`          | Org           | teams, team_members; team_id on rms; branch_id on leads/appointments                                      |
| `20260625000006_capacity_config.sql`        | Capacity      | working_hours_config, branch_holidays; config-driven v_slot_availability; branch-aware capacity functions |
| `20260625000007_lead_enhancements.sql`      | CRM           | lead_sources, lead_follow_ups; new lead columns; remove appointment_in_future constraint                  |
| `20260625000008_notification_templates.sql` | Notifications | notification_templates; retry columns on notifications                                                    |
| `20260625000009_rls_v2.sql`                 | RBAC          | has_permission(), get_accessible_branch_ids(), get_accessible_rm_ids(); hierarchy-aware policies          |
| `20260625000010_indexes_v2.sql`             | Performance   | Indexes for all new tables and columns                                                                    |
| `20260625000011_activity_triggers.sql`      | Audit         | 6 DB triggers auto-populating activity_logs                                                               |
| `20260625000012_get_user_permissions.sql`   | RBAC          | get_user_permissions() → text[] of "resource.action" for auth.uid(); powers the role-aware sidebar        |
| `20260625000013_api_grants.sql`             | Access        | Explicit GRANTs to anon/authenticated/service_role (+ default privileges); RLS still gates rows            |
| `20260625000014_fix_capacity_trigger.sql`   | Capacity      | Fix ambiguous 2-arg/3-arg capacity overloads; capacity trigger now branch-aware; drop 2-arg overloads      |

```bash
# Apply all migrations locally
supabase db reset

# Apply to production (runs only unapplied migrations)
supabase db push
```
