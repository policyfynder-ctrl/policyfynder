import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { primaryRole } from '@/lib/roles'
import type { UserRoleName } from '@/types'

// Data-access for the RBAC system. All permission checks ultimately resolve at
// the database via SECURITY DEFINER functions; these wrappers exist so pages and
// the shell never issue raw RPC/queries themselves.

/** True if the current user holds a role granting `resource.action`. */
export async function hasPermission(resource: string, action: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('has_permission', {
    p_resource: resource,
    p_action: action,
  })
  if (error) return false
  return data ?? false
}

/** Branch UUIDs the current user can access (admins → all; managers → theirs). */
export async function getAccessibleBranchIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_accessible_branch_ids')
  if (error) return []
  return data ?? []
}

/**
 * Every "resource.action" permission string for the current user.
 * Falls back to [] if the RPC is unavailable (e.g. a DB without migration 012),
 * so the shell degrades gracefully instead of crashing.
 */
export async function getUserPermissions(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_user_permissions')
  if (error) {
    console.warn('[roles] get_user_permissions unavailable:', error.message)
    return []
  }
  return data ?? []
}

/** Role names assigned to the current user (via user_roles → roles). */
export async function getCurrentUserRoles(): Promise<UserRoleName[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .order('granted_at', { ascending: true })
  if (error || !data) return []
  return data
    .map((row) => (row.roles as { name: UserRoleName } | null)?.name)
    .filter((name): name is UserRoleName => Boolean(name))
}

export type Viewer = {
  id: string
  email: string | null
  fullName: string | null
  roles: UserRoleName[]
  primaryRole: UserRoleName | null
  permissions: string[]
}

/**
 * The authenticated user plus everything the dashboard shell needs (roles +
 * permissions), in one place. Wrapped in React `cache()` so the layout and the
 * page share a single resolution per request. Returns null if not signed in.
 */
export const getCurrentViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, roles, permissions] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    getCurrentUserRoles(),
    getUserPermissions(),
  ])

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? null,
    roles,
    primaryRole: primaryRole(roles),
    permissions,
  }
})

/**
 * Route guard for server components: redirects to `/dashboard` if the current
 * user lacks the permission. RLS is the real security boundary — this is for UX
 * (don't render a page the user can't use). Call at the top of a protected page:
 *   await requirePermission('settings', 'manage')
 */
export async function requirePermission(
  resource: string,
  action: string,
  redirectTo = '/dashboard'
): Promise<void> {
  if (!(await hasPermission(resource, action))) redirect(redirectTo)
}
