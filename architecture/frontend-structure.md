# Frontend Structure — PolicyFynder

Built with Next.js 16 App Router, Tailwind CSS v4, and ShadCN UI.

---

## Folder Structure

```
src/
  app/                          # Every folder here is a URL route
    layout.tsx                  # Root layout (fonts, global providers)
    page.tsx                    # Public homepage / marketing landing
    (auth)/                     # Auth pages — not shown in URL
      login/page.tsx            # /login
      signup/page.tsx           # /signup
      reset-password/page.tsx   # /reset-password
    (public)/                   # Public pages — no auth required
      book/[branch]/page.tsx    # /book/head-office — customer booking form
    (dashboard)/                # Protected app pages — auth enforced by layout
      layout.tsx                # Dashboard shell — auth check + sidebar
      page.tsx                  # /dashboard — role-aware overview
      leads/
        page.tsx                # /dashboard/leads — lead list (filtered by role/scope)
        [id]/page.tsx           # /dashboard/leads/123 — single lead
        new/page.tsx            # /dashboard/leads/new
      appointments/
        page.tsx                # /dashboard/appointments
        [id]/page.tsx           # /dashboard/appointments/123
      follow-ups/
        page.tsx                # /dashboard/follow-ups — today's task queue
      branches/                 # Branch Manager + Admin only
        page.tsx                # /dashboard/branches
        [id]/page.tsx           # /dashboard/branches/123
        [id]/leads/page.tsx     # /dashboard/branches/123/leads
        [id]/teams/page.tsx     # /dashboard/branches/123/teams
        [id]/hours/page.tsx     # /dashboard/branches/123/hours
      teams/                    # Team Leader + above
        page.tsx                # /dashboard/teams
        [id]/page.tsx           # /dashboard/teams/123
      reports/
        page.tsx                # /dashboard/reports — scope-filtered analytics
      rms/                      # Admin + Branch Manager
        page.tsx                # /dashboard/rms
        [id]/page.tsx           # /dashboard/rms/123
      settings/                 # Admin + Super Admin
        page.tsx                # /dashboard/settings
        roles/page.tsx          # /dashboard/settings/roles
        sources/page.tsx        # /dashboard/settings/sources (lead sources)
        templates/page.tsx      # /dashboard/settings/templates (notification templates)

  components/
    ui/                         # ShadCN UI primitives (no business logic)
      button.tsx                # (already created)
      input.tsx
      badge.tsx
      table.tsx
      select.tsx
      dialog.tsx
      card.tsx
    features/                   # Business-logic components
      leads/
        LeadCard.tsx
        LeadList.tsx
        LeadStatusBadge.tsx
        LeadFilters.tsx
        LeadPriorityBadge.tsx
        LeadFollowUpPanel.tsx
        LeadSLAIndicator.tsx
        AssignLeadDialog.tsx
      appointments/
        AppointmentCard.tsx
        SlotPicker.tsx          # Reads v_slot_availability
        BookingForm.tsx         # Public-facing, anonymous submit
      rms/
        RmCard.tsx
        RmScheduleEditor.tsx
        RmLeaveForm.tsx
      teams/
        TeamCard.tsx
        TeamMemberList.tsx
      branches/
        BranchCard.tsx
        WorkingHoursEditor.tsx
        BranchHolidayList.tsx
      dashboard/
        PipelineSummary.tsx
        FollowUpQueue.tsx
        SLAAlertBanner.tsx
        RecentActivity.tsx
      reports/
        LeadConversionChart.tsx
        RmPerformanceTable.tsx
    layout/
      Sidebar.tsx               # Role-aware nav (shows only permitted items)
      Header.tsx                # User info, notifications bell
      Nav.tsx                   # Mobile navigation

  lib/
    supabase/
      client.ts                 # Browser client
      server.ts                 # Server client
      middleware.ts             # Session refresh
    utils.ts                    # cn() helper (from ShadCN setup)
    nav.ts                      # Builds nav items from permission set

  hooks/                        # Client-side data hooks
    useLeads.ts
    useAppointments.ts
    useSlotAvailability.ts
    usePermissions.ts           # Reads permission set for current user

  types/
    index.ts                    # App-level interfaces (22 entities)
    database.ts                 # Auto-generated Supabase types (regenerate after connect)

  services/                     # ALL Supabase queries live here — not in components
    leads.ts
    appointments.ts
    rms.ts
    teams.ts
    branches.ts
    sources.ts
    follow-ups.ts
    notifications.ts
    roles.ts
    activity.ts
```

---

## Page vs Component — What Goes Where

**Pages** (`app/`) — routing and data fetching only. Keep thin.

```tsx
// app/(dashboard)/leads/page.tsx
export default async function LeadsPage() {
  const leads = await listLeads() // from src/services/leads.ts
  const canAssign = await hasPermission('leads', 'assign')
  return <LeadList leads={leads} canAssign={canAssign} />
}
```

**Feature components** (`components/features/`) — UI logic and display.

```tsx
// components/features/leads/LeadList.tsx
export function LeadList({ leads, canAssign }: Props) {
  return (
    <div>
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} canAssign={canAssign} />
      ))}
    </div>
  )
}
```

**UI components** (`components/ui/`) — ShadCN primitives with no business logic.

---

## Server vs Client Components

**Server Components** (default, no `'use client'`)

- Run on the server
- Fetch data via `src/services/`
- Cannot use `useState`, `useEffect`, or browser events
- Use for: pages, layouts, data-fetching wrappers

**Client Components** (add `'use client'` at top)

- Run in the browser
- Use for: forms, dropdowns, modals, interactive state
- Data fetching via hooks (`useLeads`, etc.) or passed as props from server

**Rule:** Start server. Add `'use client'` only when you need interactivity.

---

## Authentication Guard

The dashboard layout protects all child pages:

```tsx
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <DashboardShell>{children}</DashboardShell>
}
```

Any page inside `(dashboard)/` is automatically protected.

---

## Role-Conditional Navigation

The sidebar is built from a permission set — it never hardcodes role names.

```tsx
// lib/nav.ts
export function buildNavItems(perms: Set<string>) {
  return [
    { label: 'Dashboard', href: '/dashboard', show: true },
    { label: 'Leads', href: '/dashboard/leads', show: perms.has('leads.view_assigned') },
    { label: 'Follow-ups', href: '/dashboard/follow-ups', show: perms.has('leads.view_assigned') },
    {
      label: 'Appointments',
      href: '/dashboard/appointments',
      show: perms.has('appointments.view_assigned'),
    },
    { label: 'Reports', href: '/dashboard/reports', show: perms.has('reports.view_team') },
    { label: 'Teams', href: '/dashboard/teams', show: perms.has('teams.view') },
    { label: 'Branches', href: '/dashboard/branches', show: perms.has('branches.manage') },
    { label: 'Settings', href: '/dashboard/settings', show: perms.has('settings.view') },
  ].filter((item) => item.show)
}
```

```tsx
// components/layout/Sidebar.tsx
export async function Sidebar() {
  const supabase = await createClient()
  const { data: perms } = await supabase.rpc('get_user_permissions') // returns resource.action strings
  const permSet = new Set(perms ?? [])
  const items = buildNavItems(permSet)
  return (
    <nav>
      {items.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  )
}
```

---

## Branch-Scoped Views

Pages accessed by Branch Managers or Sales Managers must pass `branch_id` context. There are two patterns:

**Pattern 1 — URL parameter (preferred for deep-links)**

```
/dashboard/branches/[id]/leads  → branch_id from the URL segment
```

**Pattern 2 — Auto-detect from user's accessible branches**

```tsx
// If user has only one accessible branch, auto-redirect
const branchIds = await getAccessibleBranchIds()
if (branchIds.length === 1) redirect(`/dashboard/branches/${branchIds[0]}/leads`)
```

RLS is the security backstop — even if a branch_id is manipulated in the URL, the DB will return empty results for branches outside the user's scope.

---

## Role-Based Dashboard Home (`/dashboard`)

The dashboard home (`app/(dashboard)/page.tsx`) renders different widgets based on the current user's primary role:

| Role                | Dashboard shows                                         |
| ------------------- | ------------------------------------------------------- |
| Super Admin / Admin | Org-wide pipeline summary, recent activity, RM overview |
| Branch Manager      | Branch pipeline, team performance, slot utilisation     |
| Sales Manager       | Team pipeline, conversion rates, follow-up backlog      |
| Team Leader         | Team lead list, daily follow-up queue, SLA alerts       |
| RM                  | My leads, today's appointments, follow-up queue         |
| Customer            | My lead status, my appointments                         |

Implement with a switch on the primary role fetched from `user_roles`, not from `profiles.role`.

---

## Public Booking Page (`/book/[branch]`)

This page has no auth guard. It uses the anonymous Supabase client.

```
/book/[branch]
  1. Reads branch slug from URL
  2. Queries v_slot_availability WHERE branch_id = <resolved_branch_id>
  3. Renders SlotPicker component (date + time grid, shows available_spots)
  4. Customer fills BookingForm (name, phone, email, insurance interest)
  5. On submit: anonymous INSERT to leads + appointments
  6. On success: shows confirmation (uses appointment.confirmation_token)
```

No login required. Overbooking is prevented at the DB level.

---

## Styling Conventions

- **Tailwind utility classes** for all styles — no separate CSS files
- **`cn()` helper** from `src/lib/utils.ts` for conditional classes
- **ShadCN components** from `src/components/ui/` — extend them, don't fork them
- Mobile-first: write base styles, then `md:` and `lg:` for larger screens
- Priority colours: `priority-1` = red, `priority-2` = orange, `priority-3` = default, `priority-4` = muted, `priority-5` = grey

---

## Adding a New Feature — Checklist

1. Read the relevant `architecture/` doc
2. Check if a component already exists in `src/components/features/`
3. Write the service function in `src/services/` (never query Supabase in the page directly)
4. Create the page in `src/app/(dashboard)/`
5. Add the nav item to `lib/nav.ts` with the correct permission check
6. Add the route protection: if it needs a permission check beyond the dashboard layout, add it at the top of the server component
