-- Migration 9: RLS v2 — Hierarchy-Aware Access
-- Adds helper functions for the new role/permission system.
-- Adds additive RLS policies for Branch Manager, Sales Manager, and Team Leader roles.
-- Existing is_admin() / is_rm() / get_rm_id() policies remain active and unchanged.
-- PostgreSQL RLS uses OR logic: if ANY policy grants access, the row is visible.

-- ============================================================
-- HELPER: has_permission(resource, action)
-- Checks if the current user holds a role that grants this resource/action combination.
-- Scope is not validated here — scope-aware checks use get_accessible_branch_ids() etc.
-- ============================================================

CREATE OR REPLACE FUNCTION has_permission(
  p_resource TEXT,
  p_action   TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.profile_id = auth.uid()
      AND p.resource = p_resource
      AND p.action = p_action
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

-- ============================================================
-- HELPER: get_accessible_branch_ids()
-- Returns the UUIDs of all branches the current user can access.
-- Admins and super admins get all branches.
-- Branch managers and sales managers get only their assigned branch.
-- ============================================================

CREATE OR REPLACE FUNCTION get_accessible_branch_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT DISTINCT scope_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.profile_id = auth.uid()
      AND ur.scope_type = 'branch'
      AND r.name IN ('branch_manager', 'sales_manager')
      AND (ur.expires_at IS NULL OR ur.expires_at > now())

    UNION ALL

    -- Global roles (admin, super_admin) get every branch
    SELECT b.id
    FROM branches b
    WHERE EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.profile_id = auth.uid()
        AND ur.scope_type = 'global'
        AND r.name IN ('super_admin', 'admin')
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );
$$;

-- ============================================================
-- HELPER: get_accessible_rm_ids()
-- Returns UUIDs of RMs whose data the current user can access.
-- Used in lead and appointment RLS policies.
-- ============================================================

CREATE OR REPLACE FUNCTION get_accessible_rm_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    -- RMs in branches the user manages
    SELECT rm.id
    FROM relationship_managers rm
    WHERE rm.branch_id = ANY(get_accessible_branch_ids())

    UNION

    -- RMs in teams where user is team_leader or sales_manager (team-scoped)
    SELECT tm.rm_id
    FROM team_members tm
    WHERE tm.is_current = true
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.profile_id = auth.uid()
          AND ur.scope_type = 'team'
          AND ur.scope_id = tm.team_id
          AND r.name IN ('team_leader', 'sales_manager')
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
      )

    UNION

    -- The user's own RM record (if they are an RM themselves)
    SELECT rm.id
    FROM relationship_managers rm
    WHERE rm.profile_id = auth.uid()
  );
$$;

-- ============================================================
-- ADDITIONAL POLICIES: leads
-- (existing admin/rm/customer policies remain; these add manager/leader access)
-- ============================================================

-- Branch managers and team leaders see leads in their scope
CREATE POLICY "leads_select_hierarchy" ON leads
  FOR SELECT TO authenticated
  USING (
    -- User manages this branch
    branch_id = ANY(get_accessible_branch_ids())
    -- OR user manages the assigned RM (team leader / sales manager path)
    OR assigned_rm_id = ANY(get_accessible_rm_ids())
  );

-- Branch managers can update/reassign leads in their branch
CREATE POLICY "leads_update_hierarchy" ON leads
  FOR UPDATE TO authenticated
  USING (
    branch_id = ANY(get_accessible_branch_ids())
    OR assigned_rm_id = ANY(get_accessible_rm_ids())
  );

-- ============================================================
-- ADDITIONAL POLICIES: appointments
-- ============================================================

CREATE POLICY "appointments_select_hierarchy" ON appointments
  FOR SELECT TO authenticated
  USING (
    branch_id = ANY(get_accessible_branch_ids())
    OR rm_id = ANY(get_accessible_rm_ids())
  );

CREATE POLICY "appointments_update_hierarchy" ON appointments
  FOR UPDATE TO authenticated
  USING (
    branch_id = ANY(get_accessible_branch_ids())
    OR rm_id = ANY(get_accessible_rm_ids())
  );

-- ============================================================
-- ADDITIONAL POLICIES: relationship_managers
-- ============================================================

CREATE POLICY "rms_select_hierarchy" ON relationship_managers
  FOR SELECT TO authenticated
  USING (
    branch_id = ANY(get_accessible_branch_ids())
    OR id = ANY(get_accessible_rm_ids())
  );

-- ============================================================
-- ADDITIONAL POLICIES: teams (refine from broad migration-5 policy)
-- ============================================================

-- Team leaders see their own team; branch managers see all teams in branch
DROP POLICY IF EXISTS "teams_select_authenticated" ON teams;

CREATE POLICY "teams_select_authenticated" ON teams
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR branch_id = ANY(get_accessible_branch_ids())
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.profile_id = auth.uid()
          AND ur.scope_type = 'team'
          AND ur.scope_id = teams.id
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
      )
      -- RMs can see their own team
      OR EXISTS (
        SELECT 1 FROM team_members tm
        JOIN relationship_managers rm ON rm.id = tm.rm_id
        WHERE tm.team_id = teams.id
          AND rm.profile_id = auth.uid()
          AND tm.is_current = true
      )
    )
  );
