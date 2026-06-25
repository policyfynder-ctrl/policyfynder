import type { UserRoleName } from '@/types'

// Pure role helpers — no server imports, safe to use in client OR server components.
// (Data-access for roles/permissions lives in src/services/roles.ts.)

export const ROLE_LABELS: Record<UserRoleName, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  branch_manager: 'Branch Manager',
  sales_manager: 'Sales Manager',
  team_leader: 'Team Leader',
  rm: 'Relationship Manager',
  customer: 'Customer',
}

// Higher number = more senior. Used to pick the role to display when a user
// holds several assignments at once.
const ROLE_RANK: Record<UserRoleName, number> = {
  super_admin: 7,
  admin: 6,
  branch_manager: 5,
  sales_manager: 4,
  team_leader: 3,
  rm: 2,
  customer: 1,
}

export function roleLabel(name: UserRoleName): string {
  return ROLE_LABELS[name] ?? name
}

/** The most senior role from a user's assignments, or null if they have none. */
export function primaryRole(roles: UserRoleName[]): UserRoleName | null {
  if (roles.length === 0) return null
  return roles.reduce((best, r) => (ROLE_RANK[r] > ROLE_RANK[best] ? r : best))
}
