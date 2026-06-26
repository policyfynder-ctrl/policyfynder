export interface NavItem {
  label: string
  href: string
}

// Builds the sidebar navigation from the current user's permission set.
// Permission strings are formatted as "resource.action" (e.g. "leads.view_assigned").
// Staff items are permission-driven; the customer portal is a distinct surface, so
// customer items are gated on the customer role.
export function buildNavItems(perms: Set<string>, role?: string | null): NavItem[] {
  if (role === 'customer') {
    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'My Policies', href: '/dashboard/my-policies' },
      { label: 'Renewals', href: '/dashboard/my-renewals' },
      { label: 'My Appointments', href: '/dashboard/my-appointments' },
      { label: 'Notifications', href: '/dashboard/notifications' },
      { label: 'Profile', href: '/dashboard/profile' },
    ]
  }

  const canViewLeads =
    perms.has('leads.view_assigned') ||
    perms.has('leads.view_team') ||
    perms.has('leads.view_branch') ||
    perms.has('leads.view_all')

  const canViewAppointments =
    perms.has('appointments.view_assigned') ||
    perms.has('appointments.view_team') ||
    perms.has('appointments.view_branch') ||
    perms.has('appointments.view_all')

  const canViewPolicies =
    perms.has('policies.view_assigned') ||
    perms.has('policies.view_team') ||
    perms.has('policies.view_branch') ||
    perms.has('policies.view_all')

  const canViewTasks =
    perms.has('tasks.view_assigned') ||
    perms.has('tasks.view_team') ||
    perms.has('tasks.view_branch') ||
    perms.has('tasks.view_all')

  const canViewReports =
    perms.has('reports.view_own') ||
    perms.has('reports.view_team') ||
    perms.has('reports.view_branch') ||
    perms.has('reports.view_all')

  const items: Array<NavItem & { show: boolean }> = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      show: true,
    },
    {
      label: 'Leads',
      href: '/dashboard/leads',
      show: canViewLeads,
    },
    {
      label: 'Follow-ups',
      href: '/dashboard/follow-ups',
      show: perms.has('leads.view_assigned'),
    },
    {
      label: 'Appointments',
      href: '/dashboard/appointments',
      show: canViewAppointments,
    },
    {
      label: 'Policies',
      href: '/dashboard/policies',
      show: canViewPolicies,
    },
    {
      label: 'Renewals',
      href: '/dashboard/renewals',
      show: canViewPolicies || perms.has('renewals.manage'),
    },
    {
      label: 'Tasks',
      href: '/dashboard/tasks',
      show: canViewTasks,
    },
    {
      label: 'Reports',
      href: '/dashboard/reports',
      show: canViewReports,
    },
    {
      label: 'Teams',
      href: '/dashboard/teams',
      show: perms.has('teams.view'),
    },
    {
      label: 'Branches',
      href: '/dashboard/branches',
      show: perms.has('branches.manage'),
    },
    {
      label: 'RMs',
      href: '/dashboard/rms',
      show: perms.has('rms.view'),
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      show: perms.has('settings.view') || perms.has('settings.manage'),
    },
  ]

  return items.filter((item) => item.show).map(({ label, href }) => ({ label, href }))
}
