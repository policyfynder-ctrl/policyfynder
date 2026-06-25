-- Migration 16: appointment audit + scoped activity log reads
-- ============================================================
-- Part 1 — Scoped activity_logs SELECT.
--   Until now only admins could read activity_logs (admin_read_activity_logs).
--   The appointment/lead activity timeline must be visible to the RMs and managers
--   who own those records. This adds a scoped read policy: a user may read an
--   activity_logs row if they performed it, or it concerns an appointment/lead they
--   can already see. The `entity_id IN (SELECT id FROM appointments/leads)`
--   subqueries are themselves RLS-filtered, so visibility exactly matches each
--   user's existing appointment/lead scope — no new bypass.
--
-- Part 2 — Specific appointment action names.
--   Replace the generic 'appointment.status_changed' log action with explicit
--   actions (appointment.confirmed/completed/cancelled/no_show/rescheduled) so the
--   audit trail and timeline read precisely. The trigger itself is unchanged; only
--   the function body is updated (CREATE OR REPLACE).
-- ============================================================

-- ---------- Part 1 ----------
CREATE POLICY "activity_logs_select_scoped" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR actor_id = auth.uid()
    OR (entity_type = 'appointment' AND entity_id IN (SELECT id FROM appointments))
    OR (entity_type = 'lead' AND entity_id IN (SELECT id FROM leads))
  );

-- ---------- Part 2 ----------
CREATE OR REPLACE FUNCTION trigger_log_appointment_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := CASE NEW.status
      WHEN 'confirmed'   THEN 'appointment.confirmed'
      WHEN 'completed'   THEN 'appointment.completed'
      WHEN 'cancelled'   THEN 'appointment.cancelled'
      WHEN 'no_show'     THEN 'appointment.no_show'
      WHEN 'rescheduled' THEN 'appointment.rescheduled'
      ELSE 'appointment.status_changed'
    END;
    PERFORM log_system_activity(
      'appointment', NEW.id, v_action,
      auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;
