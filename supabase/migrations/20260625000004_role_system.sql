-- Migration 4: Role & Permission System
-- Replaces the binary is_admin/is_rm approach with a proper RBAC model.
-- The existing user_role enum and profiles.role column are RETAINED for backward compatibility.
-- New code should use user_roles for permission checks.

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource    TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resource, action)
);

-- ============================================================
-- ROLE_PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- USER_ROLES — scoped assignments
-- scope_type = 'global'  → no scope restriction
-- scope_type = 'branch'  → branch_id in scope_id
-- scope_type = 'team'    → team_id in scope_id
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope_type  TEXT NOT NULL DEFAULT 'global'
              CHECK (scope_type IN ('global', 'branch', 'team')),
  scope_id    UUID,
  granted_by  UUID REFERENCES profiles(id),
  granted_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  CONSTRAINT user_roles_scope_consistency CHECK (
    (scope_type = 'global' AND scope_id IS NULL)
    OR (scope_type != 'global' AND scope_id IS NOT NULL)
  )
);

-- Unique: one active scoped assignment per role per scope
CREATE UNIQUE INDEX idx_user_roles_unique_assignment
  ON user_roles(profile_id, role_id, scope_type, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- ============================================================
-- SEED: ROLES
-- ============================================================

INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('super_admin',    'Super Admin',          'Full system access; manages all branches and global settings', true),
  ('admin',          'Admin',                'Administrative access within the organisation', true),
  ('branch_manager', 'Branch Manager',       'Manages all operations within a specific branch', true),
  ('sales_manager',  'Sales Manager',        'Manages a team of RMs and monitors performance', true),
  ('team_leader',    'Team Leader',          'Leads a team of RMs; assigns and reviews leads', true),
  ('rm',             'Relationship Manager', 'Handles assigned leads and conducts appointments', true),
  ('customer',       'Customer',             'End customer; views own leads and appointments only', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: PERMISSIONS
-- ============================================================

INSERT INTO permissions (resource, action, description) VALUES
  -- Leads
  ('leads', 'view_own',       'View own submitted leads'),
  ('leads', 'view_assigned',  'View leads assigned to self'),
  ('leads', 'view_team',      'View leads assigned to own team members'),
  ('leads', 'view_branch',    'View all leads in the branch'),
  ('leads', 'view_all',       'View all leads across all branches'),
  ('leads', 'create',         'Create a new lead'),
  ('leads', 'update',         'Update lead details and status'),
  ('leads', 'delete',         'Soft-delete a lead'),
  ('leads', 'assign',         'Assign or reassign a lead to an RM'),
  -- Appointments
  ('appointments', 'view_own',       'View own booked appointments'),
  ('appointments', 'view_assigned',  'View appointments for assigned leads'),
  ('appointments', 'view_team',      'View appointments for team members'),
  ('appointments', 'view_branch',    'View all appointments in the branch'),
  ('appointments', 'view_all',       'View all appointments across all branches'),
  ('appointments', 'create',         'Create an appointment'),
  ('appointments', 'update',         'Update appointment details'),
  ('appointments', 'cancel',         'Cancel an appointment'),
  -- Relationship Managers
  ('rms', 'view',             'View RM profiles and schedules'),
  ('rms', 'manage_own_team',  'Add/remove RMs in own team'),
  ('rms', 'manage_branch',    'Manage all RMs in a branch'),
  ('rms', 'manage_all',       'Manage all RMs globally'),
  -- Branches
  ('branches', 'view',        'View branch details'),
  ('branches', 'manage',      'Create and configure branches'),
  -- Teams
  ('teams', 'view',           'View team details and members'),
  ('teams', 'manage_own',     'Manage own team'),
  ('teams', 'manage_branch',  'Manage all teams in a branch'),
  ('teams', 'manage_all',     'Manage all teams globally'),
  -- Reports
  ('reports', 'view_own',     'View own performance metrics'),
  ('reports', 'view_team',    'View team-level reports'),
  ('reports', 'view_branch',  'View branch-level reports'),
  ('reports', 'view_all',     'View organisation-wide reports'),
  -- Products
  ('products', 'view',        'View insurance products'),
  ('products', 'manage',      'Add, update, and archive products'),
  -- Notifications
  ('notifications', 'view_own', 'View own notifications'),
  ('notifications', 'manage',   'Manage notification templates and settings'),
  -- Settings
  ('settings', 'view',        'View system settings'),
  ('settings', 'manage',      'Modify system settings')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================================
-- SEED: ROLE → PERMISSION ASSIGNMENTS
-- ============================================================

DO $$
DECLARE
  r_super_admin UUID;
  r_admin       UUID;
  r_bm          UUID;
  r_sm          UUID;
  r_tl          UUID;
  r_rm          UUID;
  r_customer    UUID;
BEGIN
  SELECT id INTO r_super_admin FROM roles WHERE name = 'super_admin';
  SELECT id INTO r_admin       FROM roles WHERE name = 'admin';
  SELECT id INTO r_bm          FROM roles WHERE name = 'branch_manager';
  SELECT id INTO r_sm          FROM roles WHERE name = 'sales_manager';
  SELECT id INTO r_tl          FROM roles WHERE name = 'team_leader';
  SELECT id INTO r_rm          FROM roles WHERE name = 'rm';
  SELECT id INTO r_customer    FROM roles WHERE name = 'customer';

  -- Super Admin: every permission
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_super_admin, id FROM permissions
  ON CONFLICT DO NOTHING;

  -- Admin: all except settings.manage (reserved for super admin)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_admin, id FROM permissions
  WHERE NOT (resource = 'settings' AND action = 'manage')
  ON CONFLICT DO NOTHING;

  -- Branch Manager: branch-scoped lead/appointment/rm/team + branch reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_bm, id FROM permissions
  WHERE (resource = 'leads'        AND action IN ('view_branch', 'update', 'assign'))
     OR (resource = 'appointments' AND action IN ('view_branch', 'update', 'cancel'))
     OR (resource = 'rms'          AND action IN ('view', 'manage_branch'))
     OR (resource = 'teams'        AND action IN ('view', 'manage_branch'))
     OR (resource = 'reports'      AND action = 'view_branch')
     OR (resource = 'branches'     AND action = 'view')
     OR (resource = 'products'     AND action = 'view')
     OR (resource = 'notifications' AND action = 'view_own')
  ON CONFLICT DO NOTHING;

  -- Sales Manager: team-level lead/appointment + team reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_sm, id FROM permissions
  WHERE (resource = 'leads'        AND action IN ('view_team', 'view_branch', 'assign'))
     OR (resource = 'appointments' AND action = 'view_team')
     OR (resource = 'rms'          AND action IN ('view', 'manage_own_team'))
     OR (resource = 'teams'        AND action IN ('view', 'manage_own'))
     OR (resource = 'reports'      AND action IN ('view_team', 'view_branch'))
     OR (resource = 'products'     AND action = 'view')
     OR (resource = 'notifications' AND action = 'view_own')
  ON CONFLICT DO NOTHING;

  -- Team Leader: assigned + team leads, manage own team, team reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_tl, id FROM permissions
  WHERE (resource = 'leads'        AND action IN ('view_assigned', 'view_team', 'assign'))
     OR (resource = 'appointments' AND action IN ('view_assigned', 'view_team'))
     OR (resource = 'rms'          AND action = 'view')
     OR (resource = 'teams'        AND action IN ('view', 'manage_own'))
     OR (resource = 'reports'      AND action IN ('view_team', 'view_own'))
     OR (resource = 'products'     AND action = 'view')
     OR (resource = 'notifications' AND action = 'view_own')
  ON CONFLICT DO NOTHING;

  -- RM: own assigned leads and appointments only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_rm, id FROM permissions
  WHERE (resource = 'leads'        AND action IN ('view_assigned', 'update'))
     OR (resource = 'appointments' AND action IN ('view_assigned', 'update'))
     OR (resource = 'reports'      AND action = 'view_own')
     OR (resource = 'products'     AND action = 'view')
     OR (resource = 'notifications' AND action = 'view_own')
  ON CONFLICT DO NOTHING;

  -- Customer: own records only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT r_customer, id FROM permissions
  WHERE (resource = 'leads'        AND action IN ('view_own', 'create'))
     OR (resource = 'appointments' AND action IN ('view_own', 'create'))
     OR (resource = 'notifications' AND action = 'view_own')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- UPDATE handle_new_auth_user: assign default 'customer' role
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  SELECT id INTO v_role_id FROM roles WHERE name = 'customer';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO user_roles (profile_id, role_id, scope_type)
    VALUES (NEW.id, v_role_id, 'global');
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles       ENABLE ROW LEVEL SECURITY;

-- Roles and permissions are read-only for all authenticated users
CREATE POLICY "roles_select_authenticated" ON roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "permissions_select_authenticated" ON permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions_select_authenticated" ON role_permissions
  FOR SELECT TO authenticated USING (true);

-- user_roles: users see their own; admins see all
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR is_admin());

CREATE POLICY "user_roles_insert_admin" ON user_roles
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "user_roles_update_admin" ON user_roles
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "user_roles_delete_admin" ON user_roles
  FOR DELETE TO authenticated USING (is_admin());
