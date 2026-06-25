-- Migration 11: Automated Activity Log Triggers
-- Ensures critical events land in activity_logs without relying on application code.
-- The application layer may still log supplementary events (notes, manual assignments, etc.).

-- ============================================================
-- SAFE LOGGING HELPER
-- Swallows exceptions so a logging failure never blocks the originating operation.
-- ============================================================

CREATE OR REPLACE FUNCTION log_system_activity(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_action      TEXT,
  p_actor_id    UUID DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_logs (entity_type, entity_id, action, actor_id, metadata)
  VALUES (
    p_entity_type,
    p_entity_id,
    p_action,
    COALESCE(p_actor_id, auth.uid()),
    p_metadata
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- never let a logging failure break the main transaction
END;
$$;

-- ============================================================
-- TRIGGER: lead created
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_log_lead_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_system_activity(
    'lead', NEW.id, 'lead.created',
    NEW.customer_profile_id,
    jsonb_build_object('source', NEW.source, 'status', NEW.status, 'branch_id', NEW.branch_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_lead_created
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION trigger_log_lead_created();

-- ============================================================
-- TRIGGER: lead assignment changed
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_log_lead_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.assigned_rm_id IS DISTINCT FROM NEW.assigned_rm_id THEN
    PERFORM log_system_activity(
      'lead', NEW.id, 'lead.assigned',
      auth.uid(),
      jsonb_build_object('from_rm_id', OLD.assigned_rm_id, 'to_rm_id', NEW.assigned_rm_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_lead_assigned
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION trigger_log_lead_assigned();

-- ============================================================
-- TRIGGER: appointment booked
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_log_appointment_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_system_activity(
    'appointment', NEW.id, 'appointment.booked',
    NULL,
    jsonb_build_object(
      'lead_id',  NEW.lead_id,
      'rm_id',    NEW.rm_id,
      'date',     NEW.appointment_date,
      'time',     NEW.start_time,
      'branch_id', NEW.branch_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_appointment_created
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_log_appointment_created();

-- ============================================================
-- TRIGGER: appointment status changed
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_log_appointment_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_system_activity(
      'appointment', NEW.id, 'appointment.status_changed',
      auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_appointment_status_changed
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_log_appointment_status_changed();

-- ============================================================
-- TRIGGER: RM activated / deactivated
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_log_rm_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    PERFORM log_system_activity(
      'relationship_manager', NEW.id,
      CASE WHEN NEW.is_active THEN 'rm.activated' ELSE 'rm.deactivated' END,
      auth.uid(),
      jsonb_build_object('profile_id', NEW.profile_id, 'branch_id', NEW.branch_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_rm_status_changed
  AFTER UPDATE ON relationship_managers
  FOR EACH ROW EXECUTE FUNCTION trigger_log_rm_status_changed();

-- ============================================================
-- TRIGGER: user role assigned / revoked
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_log_user_role_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT name INTO v_role_name FROM roles WHERE id = COALESCE(NEW.role_id, OLD.role_id);

  IF TG_OP = 'INSERT' THEN
    PERFORM log_system_activity(
      'profile', NEW.profile_id, 'role.assigned',
      auth.uid(),
      jsonb_build_object('role', v_role_name, 'scope_type', NEW.scope_type, 'scope_id', NEW.scope_id)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_system_activity(
      'profile', OLD.profile_id, 'role.revoked',
      auth.uid(),
      jsonb_build_object('role', v_role_name, 'scope_type', OLD.scope_type, 'scope_id', OLD.scope_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_user_role_changed
  AFTER INSERT OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION trigger_log_user_role_changed();
