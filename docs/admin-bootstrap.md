# First-Time Admin Bootstrap — PolicyFynder

This guide walks through creating the first super admin account after migrations are applied. This step is required before any admin functionality works.

---

## Why this is necessary

PolicyFynder uses two overlapping permission systems:

1. **Legacy system** (`profiles.role` enum) — `is_admin()` function checks this for backward compat
2. **New RBAC system** (`user_roles` table) — `has_permission()` function checks this for all new features

Both must be set for the first admin to have full access. New signups always start with `profiles.role = 'customer'` (set by the `handle_new_auth_user()` trigger). You must promote your account manually after first signup.

---

## Step 1 — Create Your Account

Sign up using one of these methods:

**Option A: Via Supabase Auth Dashboard**

1. Supabase Dashboard → Authentication → Users → Add User
2. Enter your email and password
3. Click Confirm

**Option B: Via Application (once auth pages are built)**

- Sign up at `/signup` with your admin email

After signup, a `profiles` row is automatically created by the database trigger with:

- `role = 'customer'` (legacy enum)
- A `customer` role in `user_roles`

---

## Step 2 — Find Your Profile UUID

In the Supabase SQL Editor:

```sql
SELECT id, email, role FROM profiles
WHERE email = 'your@email.com';
```

Copy the `id` UUID — you'll need it in the next step.

Or use the Auth dashboard: Authentication → Users → click your user → copy the UUID.

---

## Step 3 — Run Bootstrap SQL

In the Supabase SQL Editor, run both statements:

```sql
-- Step 3a: Set legacy role (required for is_admin() checks in existing RLS policies)
UPDATE profiles
SET role = 'admin'
WHERE id = '<your-profile-uuid>';

-- Step 3b: Assign super_admin in the new RBAC system (global scope)
INSERT INTO user_roles (profile_id, role_id, scope_type)
SELECT
  '<your-profile-uuid>',
  r.id,
  'global'
FROM roles r
WHERE r.name = 'super_admin';
```

Replace `<your-profile-uuid>` with the UUID from Step 2.

---

## Step 4 — Verify

```sql
-- Confirm legacy role
SELECT id, email, role FROM profiles WHERE email = 'your@email.com';
-- Expected: role = 'admin'

-- Confirm new RBAC role
SELECT ur.scope_type, r.name AS role_name
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.profile_id = '<your-profile-uuid>';
-- Expected: two rows — customer (global) and super_admin (global)

-- Confirm permission check works
-- (Run as the authenticated user, not via SQL Editor which uses service role)
SELECT has_permission('settings', 'manage');
-- Expected: true
```

---

## Step 5 — Verify Admin Access in App

Once auth pages are built (Milestone 2), sign in and confirm:

- All 9 nav items are visible in the sidebar
- Reports page is accessible
- Settings page is accessible
- You can view all leads, branches, and RMs

---

## Adding Additional Admin Users

Once you have super_admin access, use the admin panel (Milestone 8) or run this SQL for each new admin:

```sql
-- Promote an existing user to admin
UPDATE profiles SET role = 'admin'
WHERE email = 'another-admin@email.com';

INSERT INTO user_roles (profile_id, role_id, scope_type, granted_by)
SELECT
  p.id,
  r.id,
  'global',
  '<your-profile-uuid>'  -- you are granting this
FROM profiles p, roles r
WHERE p.email = 'another-admin@email.com'
  AND r.name = 'admin';
```

---

## Adding a Branch Manager

Branch managers have `scope_type = 'branch'` and `scope_id = <branch-uuid>`.

```sql
-- Find the branch UUID
SELECT id, name, code FROM branches;

-- Assign branch_manager role scoped to one branch
INSERT INTO user_roles (profile_id, role_id, scope_type, scope_id, granted_by)
SELECT
  p.id,
  r.id,
  'branch',
  '<branch-uuid>',
  '<your-profile-uuid>'
FROM profiles p, roles r
WHERE p.email = 'manager@email.com'
  AND r.name = 'branch_manager';
```

---

## Adding an RM

RMs need two things: a `user_roles` assignment AND a `relationship_managers` row.

```sql
-- Step 1: Assign rm role
INSERT INTO user_roles (profile_id, role_id, scope_type, granted_by)
SELECT p.id, r.id, 'global', '<your-profile-uuid>'
FROM profiles p, roles r
WHERE p.email = 'rm@email.com' AND r.name = 'rm';

-- Step 2: Also set legacy role
UPDATE profiles SET role = 'rm'
WHERE email = 'rm@email.com';

-- Step 3: Create RM record (link to branch)
INSERT INTO relationship_managers (profile_id, branch_id, max_daily_appointments)
SELECT
  p.id,
  b.id,
  8
FROM profiles p, branches b
WHERE p.email = 'rm@email.com'
  AND b.code = 'head-office';

-- Step 4: Add RM schedule (Mon–Fri, 10am–6pm)
INSERT INTO rm_schedules (rm_id, day_of_week, start_time, end_time)
SELECT rm.id, d.day, '10:00'::TIME, '18:00'::TIME
FROM relationship_managers rm
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(day)
WHERE rm.profile_id = (SELECT id FROM profiles WHERE email = 'rm@email.com');
```

---

## Role Reference

| Role           | scope_type | scope_id    |
| -------------- | ---------- | ----------- |
| super_admin    | global     | NULL        |
| admin          | global     | NULL        |
| branch_manager | branch     | branch UUID |
| sales_manager  | branch     | branch UUID |
| team_leader    | team       | team UUID   |
| rm             | global     | NULL        |
| customer       | global     | NULL        |

A user can hold multiple roles simultaneously. Each role assignment is one row in `user_roles`.

---

## Troubleshooting

**`has_permission()` returns false after bootstrap**

- Confirm you ran as the authenticated user (not service role via SQL Editor)
- Check `user_roles`: `SELECT * FROM user_roles WHERE profile_id = '<uuid>'`
- Confirm the role name is exactly `'super_admin'` (lowercase, underscore)

**`is_admin()` returns false**

- Check `profiles.role`: `SELECT role FROM profiles WHERE id = '<uuid>'`
- Must be `'admin'` — not `'super_admin'` (the legacy enum has only `admin | rm | customer`)

**Cannot insert into `user_roles` via Supabase client (permission denied)**

- The `user_roles` INSERT policy uses `is_admin()` (legacy check)
- Until `profiles.role = 'admin'` is set, use the Supabase SQL Editor with the service role to bypass RLS
- Or use the admin client (service role key) via `src/app/api/` route
