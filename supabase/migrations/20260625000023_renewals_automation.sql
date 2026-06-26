-- Migration 23: Renewals & Reminders automation
-- ============================================================
-- Milestone 9. Adds:
--   * a generic `tasks` table (RM follow-ups across leads/policies/appointments)
--   * generate_renewal_reminders(): for each active policy due to renew, creates a
--     MANDATORY renewal TASK (the primary reminder) and an OPTIONAL in-app
--     notification. Both are idempotent. Queue-only — no email/WhatsApp/SMS.
--   * scoped RLS, permissions, and DB-level audit.
-- ============================================================

-- ===== TABLE: tasks =====
CREATE TABLE tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('lead','policy','appointment','general')),
  entity_id      UUID,
  assigned_rm_id UUID REFERENCES relationship_managers(id),
  created_by     UUID REFERENCES profiles(id),
  title          TEXT NOT NULL,
  note           TEXT,
  kind           TEXT NOT NULL DEFAULT 'follow_up',   -- follow_up | renewal | contact
  due_at         TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_tasks_rm     ON tasks(assigned_rm_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_entity ON tasks(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due    ON tasks(due_at)                 WHERE completed_at IS NULL AND deleted_at IS NULL;
-- Supports the idempotency NOT EXISTS check for open renewal tasks.
CREATE INDEX idx_tasks_open_renewal ON tasks(entity_type, entity_id, kind)
  WHERE completed_at IS NULL AND deleted_at IS NULL;

-- ===== RLS: tasks (scoped by assigned RM + manager hierarchy, mirrors leads/policies) =====
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_tasks ON tasks FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY tasks_select_scoped ON tasks FOR SELECT TO authenticated
  USING (assigned_rm_id = get_rm_id() OR assigned_rm_id = ANY(get_accessible_rm_ids()));

CREATE POLICY tasks_insert_scoped ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR assigned_rm_id = get_rm_id()
    OR assigned_rm_id = ANY(get_accessible_rm_ids())
  );

CREATE POLICY tasks_update_scoped ON tasks FOR UPDATE TO authenticated
  USING (assigned_rm_id = get_rm_id() OR assigned_rm_id = ANY(get_accessible_rm_ids()))
  WITH CHECK (assigned_rm_id = get_rm_id() OR assigned_rm_id = ANY(get_accessible_rm_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO anon, authenticated, service_role;

-- ===== notifications: scoped read for staff (policy/lead reminders in scope) =====
-- Replaces the recipient-self-only SELECT with one that also lets a user read a
-- reminder tied to a policy/lead already visible to them (subqueries are RLS-filtered).
DROP POLICY IF EXISTS "user_own_notifications_select" ON notifications;
CREATE POLICY "notifications_select_scoped" ON notifications FOR SELECT TO authenticated
  USING (
    recipient_id = auth.uid()
    OR (policy_id IS NOT NULL AND policy_id IN (SELECT id FROM policies))
    OR (lead_id   IS NOT NULL AND lead_id   IN (SELECT id FROM leads))
  );

-- ===== FUNCTION: generate_renewal_reminders(days_ahead) =====
-- For each active policy due to renew within p_days_ahead (not already renewed,
-- with an assigned RM):
--   (1) MANDATORY: create an open renewal TASK — the primary reminder.
--   (2) OPTIONAL:  create a pending in-app NOTIFICATION.
-- Idempotent: skips a policy that already has an OPEN renewal task / a PENDING (or
-- sent/delivered) renewal notification. Returns the number of TASKS created.
CREATE OR REPLACE FUNCTION generate_renewal_reminders(p_days_ahead INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tasks INT;
BEGIN
  -- (1) Mandatory renewal task (idempotent on open renewal task per policy)
  WITH ins AS (
    INSERT INTO tasks (entity_type, entity_id, assigned_rm_id, kind, title, note, due_at, created_by)
    SELECT 'policy', p.id, p.assigned_rm_id, 'renewal', 'Policy renewal due',
           format('Renewal due on %s for policy %s', p.renewal_date, p.policy_number),
           p.renewal_date::timestamptz,
           auth.uid()
    FROM policies p
    WHERE p.deleted_at IS NULL
      AND p.status = 'active'
      AND p.renewal_completed_at IS NULL
      AND p.renewal_date IS NOT NULL
      AND p.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
      AND p.assigned_rm_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.entity_type = 'policy' AND t.entity_id = p.id
          AND t.kind = 'renewal' AND t.completed_at IS NULL AND t.deleted_at IS NULL
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_tasks FROM ins;

  -- (2) Optional in-app notification (idempotent on open renewal notification per policy)
  INSERT INTO notifications (recipient_id, policy_id, type, channel, status, scheduled_at, payload)
  SELECT rm.profile_id, p.id, 'policy_renewal_reminder', 'in_app', 'pending', now(),
         jsonb_build_object('renewal_date', p.renewal_date, 'policy_number', p.policy_number)
  FROM policies p
  JOIN relationship_managers rm ON rm.id = p.assigned_rm_id
  WHERE p.deleted_at IS NULL
    AND p.status = 'active'
    AND p.renewal_completed_at IS NULL
    AND p.renewal_date IS NOT NULL
    AND p.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
    AND rm.profile_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.policy_id = p.id
        AND n.type = 'policy_renewal_reminder'
        AND n.status IN ('pending','sent','delivered')
    );

  RETURN v_tasks;
END;
$$;

-- Generation is privileged/system work — invoked by the service-role admin API.
GRANT EXECUTE ON FUNCTION generate_renewal_reminders(INT) TO service_role;

-- ===== AUDIT: task lifecycle + scoped activity read =====
CREATE OR REPLACE FUNCTION trigger_log_task_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_system_activity('task', NEW.id, 'task.created', NEW.created_by,
    jsonb_build_object('kind', NEW.kind, 'entity_type', NEW.entity_type,
      'entity_id', NEW.entity_id, 'assigned_rm_id', NEW.assigned_rm_id));
  RETURN NEW;
END; $$;
CREATE TRIGGER log_task_created AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_log_task_created();

CREATE OR REPLACE FUNCTION trigger_log_task_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    PERFORM log_system_activity('task', NEW.id, 'task.completed', auth.uid(),
      jsonb_build_object('kind', NEW.kind, 'entity_type', NEW.entity_type, 'entity_id', NEW.entity_id));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER log_task_completed AFTER UPDATE OF completed_at ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_log_task_completed();

-- Extend the scoped activity_logs read (migration 020) to include 'task'.
DROP POLICY IF EXISTS "activity_logs_select_scoped" ON activity_logs;
CREATE POLICY "activity_logs_select_scoped" ON activity_logs FOR SELECT TO authenticated
  USING (
    is_admin()
    OR actor_id = auth.uid()
    OR (entity_type = 'appointment' AND entity_id IN (SELECT id FROM appointments))
    OR (entity_type = 'lead'        AND entity_id IN (SELECT id FROM leads))
    OR (entity_type = 'policy'      AND entity_id IN (SELECT id FROM policies))
    OR (entity_type = 'task'        AND entity_id IN (SELECT id FROM tasks))
  );

-- ===== PERMISSIONS: tasks + renewals (mirrors migration 004 / 021 pattern) =====
INSERT INTO permissions (resource, action, description) VALUES
  ('tasks','view_assigned','View own tasks'),
  ('tasks','view_team',    'View team members'' tasks'),
  ('tasks','view_branch',  'View all tasks in the branch'),
  ('tasks','view_all',     'View all tasks'),
  ('tasks','create',       'Create a task'),
  ('tasks','update',       'Update / complete a task'),
  ('renewals','manage',    'Generate and action policy renewal reminders')
ON CONFLICT (resource, action) DO NOTHING;

DO $$
DECLARE r_bm UUID; r_sm UUID; r_tl UUID; r_rm UUID;
BEGIN
  SELECT id INTO r_bm FROM roles WHERE name='branch_manager';
  SELECT id INTO r_sm FROM roles WHERE name='sales_manager';
  SELECT id INTO r_tl FROM roles WHERE name='team_leader';
  SELECT id INTO r_rm FROM roles WHERE name='rm';

  -- super_admin & admin catch-alls in 004 ran before these existed → add now
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name='super_admin' AND p.resource IN ('tasks','renewals') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name='admin' AND p.resource IN ('tasks','renewals') ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_bm, id FROM permissions WHERE
      (resource='tasks' AND action IN ('view_branch','create','update'))
      OR (resource='renewals' AND action='manage') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_sm, id FROM permissions WHERE
      (resource='tasks' AND action IN ('view_team','view_branch','create','update'))
      OR (resource='renewals' AND action='manage') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_tl, id FROM permissions WHERE
      (resource='tasks' AND action IN ('view_assigned','view_team','create','update'))
      OR (resource='renewals' AND action='manage') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_rm, id FROM permissions WHERE
      resource='tasks' AND action IN ('view_assigned','create','update') ON CONFLICT DO NOTHING;
END $$;
