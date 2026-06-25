-- Migration 15: audit lead status changes in activity_logs
-- ============================================================
-- Migration 011 logs lead.created and lead.assigned, and migration 001 records
-- every status change into lead_stage_history. But there was no activity_logs entry
-- for status transitions. Milestone 5 (lead management) requires status changes to
-- be audited in activity_logs, so add a DB trigger — auditing at the database layer
-- means it can't be bypassed by any caller (app, SQL, or service role).
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_log_lead_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_system_activity(
      'lead', NEW.id, 'lead.status_changed',
      auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_lead_status_changed
  AFTER UPDATE OF status ON leads
  FOR EACH ROW EXECUTE FUNCTION trigger_log_lead_status_changed();
