-- Migration 18: hierarchy-aware RM & team management RLS
-- ============================================================
-- The RBAC matrix grants managers rms.manage_branch / teams.manage_branch /
-- teams.manage_own / rms.manage_own_team, but no RLS policy honored them — all
-- writes were is_admin()-only. This wires those permissions into scoped write
-- policies (additive; the existing admin_all_* policies remain, RLS is OR-combined).
--
-- Sensitive operations (profiles.role, user_roles) are deliberately NOT loosened
-- here — RM creation / role assignment goes through the service-role API route.
-- ============================================================

-- Teams the current user may manage at the "own" level (and, for branch managers,
-- every team in their branches). SECURITY DEFINER so it bypasses RLS on the tables
-- it reads → no recursion when used inside the teams/team_members policies.
CREATE OR REPLACE FUNCTION get_accessible_team_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    -- teams in branches the user manages
    SELECT t.id FROM teams t WHERE t.branch_id = ANY(get_accessible_branch_ids())
    UNION
    -- teams the user leads
    SELECT t.id FROM teams t
    JOIN relationship_managers rm ON rm.id = t.team_leader_rm_id
    WHERE rm.profile_id = auth.uid()
    UNION
    -- teams the user holds a team-scoped role on
    SELECT ur.scope_id FROM user_roles ur
    WHERE ur.profile_id = auth.uid()
      AND ur.scope_type = 'team'
      AND ur.scope_id IS NOT NULL
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

-- ---------- relationship_managers (branch managers) ----------
CREATE POLICY "rms_insert_branch" ON relationship_managers
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission('rms', 'manage_branch')
    AND branch_id = ANY(get_accessible_branch_ids())
  );

CREATE POLICY "rms_update_branch" ON relationship_managers
  FOR UPDATE TO authenticated
  USING (
    has_permission('rms', 'manage_branch')
    AND branch_id = ANY(get_accessible_branch_ids())
  )
  WITH CHECK (branch_id = ANY(get_accessible_branch_ids()));

-- ---------- rm_schedules (manage schedules for RMs in your branch) ----------
CREATE POLICY "rm_schedules_manage_branch" ON rm_schedules
  FOR ALL TO authenticated
  USING (
    has_permission('rms', 'manage_branch')
    AND rm_id IN (
      SELECT id FROM relationship_managers WHERE branch_id = ANY(get_accessible_branch_ids())
    )
  )
  WITH CHECK (
    has_permission('rms', 'manage_branch')
    AND rm_id IN (
      SELECT id FROM relationship_managers WHERE branch_id = ANY(get_accessible_branch_ids())
    )
  );

-- ---------- teams (manage_branch creates/edits in branch; manage_own edits own) ----------
CREATE POLICY "teams_manage_scoped" ON teams
  FOR ALL TO authenticated
  USING (
    (has_permission('teams', 'manage_branch') AND branch_id = ANY(get_accessible_branch_ids()))
    OR (has_permission('teams', 'manage_own') AND id = ANY(get_accessible_team_ids()))
  )
  WITH CHECK (
    (has_permission('teams', 'manage_branch') AND branch_id = ANY(get_accessible_branch_ids()))
    OR (has_permission('teams', 'manage_own') AND id = ANY(get_accessible_team_ids()))
  );

-- ---------- team_members (add/remove members of accessible teams) ----------
CREATE POLICY "team_members_manage_scoped" ON team_members
  FOR ALL TO authenticated
  USING (
    (
      has_permission('teams', 'manage_branch')
      OR has_permission('teams', 'manage_own')
      OR has_permission('rms', 'manage_own_team')
    )
    AND team_id = ANY(get_accessible_team_ids())
  )
  WITH CHECK (
    (
      has_permission('teams', 'manage_branch')
      OR has_permission('teams', 'manage_own')
      OR has_permission('rms', 'manage_own_team')
    )
    AND team_id = ANY(get_accessible_team_ids())
  );
