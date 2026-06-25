# Backend Structure — PolicyFynder

PolicyFynder has no traditional backend server. Backend logic lives in three places:

1. **Supabase** — database, auth, RLS, storage, and Edge Functions
2. **Next.js API routes** — server-only operations (admin actions, file exports, webhooks)
3. **`src/services/`** — the application's data access layer (all Supabase queries live here)

---

## Where Backend Logic Lives

```
Supabase (hosted)
  ├── Database (Postgres — 22 tables)
  ├── Row Level Security (RBAC-aware policies)
  ├── DB Triggers (capacity enforcement, audit log, stage history)
  ├── DB Functions (capacity calculation, RBAC helpers)
  ├── Auth (login, signup, sessions)
  ├── Storage (documents, attachments)
  └── Edge Functions (supabase/functions/)
        └── notification-worker/   # Polls notifications table, sends via WhatsApp/email/SMS

Next.js (Vercel)
  └── src/app/api/
        ├── admin/           # Admin operations using service role key
        ├── webhooks/        # Incoming webhooks (payment, delivery receipts)
        └── exports/         # CSV and PDF generation
```

---

## Supabase Clients — Which One to Use

There are three Supabase clients. Using the wrong one is a security risk.

### Browser Client (`lib/supabase/client.ts`)

- Use in **`'use client'`** components
- Anonymous key — safe to expose to the browser
- Session is attached automatically from the browser cookie
- RLS policies apply — user sees only what their roles allow

### Server Client (`lib/supabase/server.ts`)

- Use in **server components** and **Next.js API routes** (non-admin)
- Reads session from request cookies
- RLS policies apply

### Admin Client (API routes only)

- Created inline with `SUPABASE_SERVICE_ROLE_KEY`
- **Never use in components or server components**
- Bypasses RLS — can access any row
- Required for: creating profiles manually, assigning roles, sending system emails

```ts
// Only in src/app/api/ — never in components
import { createClient } from '@supabase/supabase-js'
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Service Layer (`src/services/`)

**All database queries live in `src/services/`.** No component or page file should contain a `.from()` call.

One file per table (or per domain concept):

```
src/services/
  leads.ts            # createLead, getLead, listLeads, updateLeadStatus, assignLead
  appointments.ts     # bookAppointment, listAppointments, cancelAppointment
  rms.ts              # getRm, listRms, activateRm, setSchedule
  teams.ts            # createTeam, addTeamMember, removeTeamMember
  branches.ts         # getBranch, listBranches, getWorkingHours
  sources.ts          # listLeadSources
  follow-ups.ts       # scheduleFollowUp, completeFollowUp, listPendingFollowUps
  notifications.ts    # queueNotification, markDelivered
  roles.ts            # getUserRoles, assignRole, revokeRole, hasPermission
  activity.ts         # logActivity, getActivityFeed
```

### Service function pattern

```ts
// src/services/leads.ts
import { createClient } from '@/lib/supabase/server'

export async function listLeads(filters?: {
  status?: LeadStatus
  branch_id?: string
  rm_id?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('leads')
    .select(
      '*, source:lead_sources(name, slug), rm:relationship_managers(id, profile:profiles(full_name))'
    )
    .is('deleted_at', null)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters?.rm_id) query = query.eq('assigned_rm_id', filters.rm_id)

  const { data, error } = await query
  if (error) throw error
  return data
}
```

**Rules for service functions:**

- Always filter soft-deleted rows: `.is('deleted_at', null)`
- Always handle errors: `if (error) throw error` — never silently return `null`
- Never accept raw SQL strings as input (SQL injection risk)
- Return typed data — let the Supabase generated types flow through

---

## RBAC in the Application Layer

### Checking permissions in a server component

```ts
// src/services/roles.ts
export async function hasPermission(resource: string, action: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('has_permission', { p_resource: resource, p_action: action })
  return data ?? false
}

export async function getAccessibleBranchIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_accessible_branch_ids')
  return data ?? []
}
```

```ts
// In a server component
import { hasPermission } from '@/services/roles'

export default async function LeadsPage() {
  const canAssign = await hasPermission('leads', 'assign')
  // Pass as prop to client component for conditional rendering
  return <LeadList showAssignButton={canAssign} />
}
```

### Role-based navigation

Build navigation arrays from the permission set — don't hardcode role names in the UI.

```ts
// src/lib/nav.ts
export function buildNavItems(permissions: Set<string>) {
  return [
    { label: 'Leads', href: '/dashboard/leads', show: permissions.has('leads.view_assigned') },
    { label: 'Reports', href: '/dashboard/reports', show: permissions.has('reports.view_team') },
    { label: 'Branches', href: '/dashboard/branches', show: permissions.has('branches.manage') },
    { label: 'Settings', href: '/dashboard/settings', show: permissions.has('settings.manage') },
  ].filter((item) => item.show)
}
```

---

## Next.js API Routes

Use API routes **only** when you need to:

- Bypass RLS for an admin operation
- Generate files (PDFs, CSVs)
- Handle webhooks from third-party services
- Call external APIs without exposing credentials

```
src/app/api/
  admin/
    assign-role/route.ts       # POST: assign a role to a user (uses admin client)
    deactivate-rm/route.ts     # POST: soft-delete an RM profile
  exports/
    leads/route.ts             # GET: export leads as CSV
  webhooks/
    whatsapp/route.ts          # POST: WhatsApp delivery receipt webhook
```

Every API route must:

1. Verify the session — return 401 if not authenticated
2. Check the required permission — return 403 if insufficient
3. Never accept raw SQL in request parameters

```ts
// src/app/api/admin/assign-role/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check permission server-side (don't trust client-sent flags)
  const { data: allowed } = await supabase.rpc('has_permission', {
    p_resource: 'settings',
    p_action: 'manage',
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profile_id, role_name, scope_type, scope_id } = await request.json()
  const admin = createAdminClient()
  // ... admin operation
  return NextResponse.json({ success: true })
}
```

---

## Edge Functions — Notification Worker

Location: `supabase/functions/notification-worker/`

The notification worker is a scheduled Edge Function (invoked every 2 minutes via pg_cron or Supabase scheduler) that:

1. Queries `notifications` for pending or retryable records
2. Validates required template variables are present in `payload`
3. Sends via the appropriate channel (email, WhatsApp Business API, SMS)
4. Updates `status`, `sent_at`, `provider_message_id`
5. On failure: increments `retry_count`, sets `next_retry_at`, caps at `max_retries`

```ts
// supabase/functions/notification-worker/index.ts (pseudocode)
const due = await supabase
  .from('notifications')
  .select('*, template:notification_templates(*)')
  .or('status.eq.pending,and(status.eq.failed,next_retry_at.lte.now())')
  .lt('retry_count', supabase.raw('max_retries'))

for (const notification of due) {
  await sendViaChannel(notification)
}
```

---

## Authentication Flow

### Sign up (customer self-registration)

```ts
await supabase.auth.signUp({ email, password })
// DB trigger handle_new_auth_user() fires:
//   1. Creates profiles row
//   2. Assigns 'customer' role in user_roles
```

### Sign in

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```

### First admin setup

After first signup, use the Supabase dashboard or an API route with the admin client to insert a `super_admin` row into `user_roles` for your account:

```sql
INSERT INTO user_roles (profile_id, role_id, scope_type)
SELECT '<your-profile-id>', id, 'global' FROM roles WHERE name = 'super_admin';
```

### Session handling

`src/middleware.ts` calls `updateSession()` on every request to refresh the cookie session. Server components call `supabase.auth.getUser()` — not `getSession()` — to get a fresh, server-verified user on every render.

---

## Database Access Pattern

**Server component (preferred for initial data load):**

```ts
import { createClient } from '@/lib/supabase/server'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('*, source:lead_sources(name, channel_type), rm:relationship_managers(profile:profiles(full_name))')
    .is('deleted_at', null)
    .order('priority')
  return <LeadList leads={leads} />
}
```

**Client component (for interactive updates after the page loads):**

```ts
'use client'
import { createClient } from '@/lib/supabase/client'

async function updatePriority(leadId: string, priority: number) {
  const supabase = createClient()
  await supabase.from('leads').update({ priority }).eq('id', leadId)
}
```

---

## Branch-Scoped Query Pattern

When building features for Branch Managers or Sales Managers, filter by accessible branches using the DB helper function:

```ts
// src/services/branches.ts
export async function getAccessibleBranchIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_accessible_branch_ids')
  return data ?? []
}

// In a service function
export async function listBranchLeads(branchId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
  return data
}
```

RLS will still enforce the scope — if the caller doesn't have `view_branch` permission for that branch, the query returns an empty result. The application-layer check is for UX (deciding whether to show the page), not security (which is enforced at the DB level).
