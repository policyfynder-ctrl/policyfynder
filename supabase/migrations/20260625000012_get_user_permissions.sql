-- Migration 12: get_user_permissions()
-- ============================================================
-- Returns the flat set of permission strings ("resource.action") granted to the
-- CURRENT authenticated user across all of their (non-expired) role assignments.
--
-- This is the bulk companion to has_permission(resource, action):
--   has_permission('leads','view_assigned')  ⇔  'leads.view_assigned' = ANY(get_user_permissions())
-- It exists so the app can fetch every permission once (e.g. to build the sidebar
-- via lib/nav.ts → buildNavItems) instead of issuing one RPC per nav item.
--
-- Scope (branch/team) is intentionally NOT encoded here — it mirrors has_permission(),
-- which also ignores scope. Scope-aware filtering is done separately via
-- get_accessible_branch_ids() / get_accessible_rm_ids().
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT DISTINCT p.resource || '.' || p.action
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p       ON p.id = rp.permission_id
    WHERE ur.profile_id = auth.uid()
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
    ORDER BY 1
  );
$$;

COMMENT ON FUNCTION get_user_permissions() IS
  'Returns text[] of "resource.action" permission strings for the current authenticated user (auth.uid()). Bulk companion to has_permission(); ignores scope. Used by buildNavItems().';

-- Callable by signed-in users via supabase.rpc('get_user_permissions').
-- SECURITY DEFINER lets it read user_roles/permissions regardless of the caller's
-- own RLS, while WHERE ur.profile_id = auth.uid() restricts results to the caller.
GRANT EXECUTE ON FUNCTION get_user_permissions() TO authenticated;
