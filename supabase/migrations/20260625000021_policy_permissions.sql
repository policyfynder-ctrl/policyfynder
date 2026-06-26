-- Migration 21: Policy permissions (mirrors migration 004 structure)
-- ============================================================
-- Adds the 'policies' resource to the RBAC catalogue and maps it onto roles.
-- super_admin / admin received their catch-all grants in migration 004 BEFORE
-- these permission rows existed, so we re-grant policies.* to them explicitly here.
-- ============================================================

INSERT INTO permissions (resource, action, description) VALUES
  ('policies','view_own',      'View own policies (customer)'),
  ('policies','view_assigned', 'View policies assigned to self'),
  ('policies','view_team',     'View policies of own team members'),
  ('policies','view_branch',   'View all policies in the branch'),
  ('policies','view_all',      'View all policies across branches'),
  ('policies','create',        'Create a policy'),
  ('policies','update',        'Update policy details and status'),
  ('policies','delete',        'Soft-delete a policy'),
  ('policies','assign',        'Assign/reassign a policy to an RM')
ON CONFLICT (resource, action) DO NOTHING;

DO $$
DECLARE r_bm UUID; r_sm UUID; r_tl UUID; r_rm UUID; r_customer UUID;
BEGIN
  SELECT id INTO r_bm       FROM roles WHERE name='branch_manager';
  SELECT id INTO r_sm       FROM roles WHERE name='sales_manager';
  SELECT id INTO r_tl       FROM roles WHERE name='team_leader';
  SELECT id INTO r_rm       FROM roles WHERE name='rm';
  SELECT id INTO r_customer FROM roles WHERE name='customer';

  -- super_admin & admin: catch-alls in 004 ran before these existed → add now
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name='super_admin' AND p.resource='policies' ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name='admin' AND p.resource='policies' ON CONFLICT DO NOTHING;

  -- Branch Manager: branch-wide visibility + full management
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_bm, id FROM permissions WHERE resource='policies'
      AND action IN ('view_branch','create','update','assign','delete') ON CONFLICT DO NOTHING;

  -- Sales Manager: team + branch visibility, create/update/assign
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_sm, id FROM permissions WHERE resource='policies'
      AND action IN ('view_team','view_branch','create','update','assign') ON CONFLICT DO NOTHING;

  -- Team Leader: assigned + team visibility, create/update/assign
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_tl, id FROM permissions WHERE resource='policies'
      AND action IN ('view_assigned','view_team','create','update','assign') ON CONFLICT DO NOTHING;

  -- RM: own assigned policies, create/update
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_rm, id FROM permissions WHERE resource='policies'
      AND action IN ('view_assigned','create','update') ON CONFLICT DO NOTHING;

  -- Customer: own policies only (future portal)
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_customer, id FROM permissions WHERE resource='policies'
      AND action='view_own' ON CONFLICT DO NOTHING;
END $$;
