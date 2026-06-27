-- Migration 26: Communication Foundation (queue-only)
-- ============================================================
-- Milestone 12. Builds the multi-channel communication foundation ON the existing
-- `notifications` queue (the documented message queue + future Edge-Function worker).
-- NO live sending, no provider integration — messages sit at status='pending'.
--   * communication_category enum + category on notifications & notification_templates
--   * notification_templates.body — renderable {{variable}} template content
--   * notifications.created_by — who composed a manual message
--   * delivery_logs — append-only per-attempt/status history (worker + webhooks in M13)
--   * communication_preferences — per-profile channel opt-in + preferred channel
--   * consent_records — immutable consent ledger
--   * STRICT consent trigger — blocks email/whatsapp/sms to non-opted-in recipients
--     (in_app always allowed)
--   * notifications_insert_staff RLS — staff compose/queue for in-scope records
--   * communication timeline trigger → activity_logs (queued/sent/delivered/...)
--   * communications permissions; seeded predefined templates
-- ============================================================

-- ===== Category enum + columns =====
CREATE TYPE communication_category AS ENUM (
  'renewal_reminder', 'welcome', 'appointment_confirmation', 'appointment_reminder',
  'policy_issued', 'policy_expiry', 'follow_up', 'claim_update', 'custom'
);

ALTER TABLE notification_templates ADD COLUMN body TEXT;                              -- {{variable}} content
ALTER TABLE notification_templates ADD COLUMN category communication_category;        -- reporting/grouping
ALTER TABLE notifications ADD COLUMN category communication_category NOT NULL DEFAULT 'custom';
ALTER TABLE notifications ADD COLUMN created_by UUID REFERENCES profiles(id);
-- `type` stays NOT NULL (a stable, required queue field). Manual / RM-composed
-- messages use the generic type 'custom'; `category` carries the business
-- communication classification. (Not used within this migration, so adding the
-- enum value here is transaction-safe.)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'custom';

CREATE INDEX idx_notifications_pending ON notifications(scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_notifications_category ON notifications(category);

-- ===== delivery_logs (append-only) =====
CREATE TABLE delivery_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id   UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  status            notification_status NOT NULL,
  attempt           SMALLINT NOT NULL DEFAULT 1,
  detail            TEXT,
  provider_response JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_logs_notification ON delivery_logs(notification_id, created_at DESC);

ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_delivery_logs ON delivery_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
-- Readable if the parent notification is visible to the caller (RLS-filtered subquery).
CREATE POLICY delivery_logs_select_scoped ON delivery_logs FOR SELECT TO authenticated
  USING (notification_id IN (SELECT id FROM notifications));
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_logs TO anon, authenticated, service_role;

-- ===== communication_preferences (per profile) =====
CREATE TABLE communication_preferences (
  profile_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_opt_in      BOOLEAN NOT NULL DEFAULT true,
  whatsapp_opt_in   BOOLEAN NOT NULL DEFAULT false,   -- WhatsApp requires explicit opt-in
  sms_opt_in        BOOLEAN NOT NULL DEFAULT false,
  in_app_opt_in     BOOLEAN NOT NULL DEFAULT true,
  preferred_channel notification_channel NOT NULL DEFAULT 'email',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_communication_preferences_updated_at BEFORE UPDATE ON communication_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_comm_prefs ON communication_preferences FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY comm_prefs_self ON communication_preferences FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON communication_preferences TO anon, authenticated, service_role;

-- ===== consent_records (immutable ledger) =====
CREATE TABLE consent_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel     notification_channel NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('granted','revoked')),
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_records_profile ON consent_records(profile_id, channel, created_at DESC);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_all_consent ON consent_records FOR ALL USING (is_admin()) WITH CHECK (is_admin());
-- Self can append + read own consent; no UPDATE/DELETE (append-only).
CREATE POLICY consent_self_insert ON consent_records FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY consent_self_select ON consent_records FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON consent_records TO anon, authenticated, service_role;

-- ===== Scoped recipient preferences (for staff compose; no broad exposure) =====
CREATE OR REPLACE FUNCTION get_recipient_preferences(p_profile_id UUID)
RETURNS TABLE (email_opt_in BOOLEAN, whatsapp_opt_in BOOLEAN, sms_opt_in BOOLEAN, in_app_opt_in BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  -- Effective opt-in (defaults applied when no row exists). Only returns data to a
  -- caller who can compose communications; the row itself is not exposed.
  SELECT
    COALESCE(cp.email_opt_in, true),
    COALESCE(cp.whatsapp_opt_in, false),
    COALESCE(cp.sms_opt_in, false),
    COALESCE(cp.in_app_opt_in, true)
  FROM (SELECT 1) one
  LEFT JOIN communication_preferences cp ON cp.profile_id = p_profile_id
  WHERE has_permission('communications', 'send');
$$;
GRANT EXECUTE ON FUNCTION get_recipient_preferences(UUID) TO authenticated;

-- ===== STRICT consent enforcement (BEFORE INSERT on notifications) =====
CREATE OR REPLACE FUNCTION enforce_communication_consent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ok BOOLEAN;
BEGIN
  IF NEW.channel = 'in_app' THEN RETURN NEW; END IF;        -- in-app always allowed
  IF NEW.recipient_id IS NULL THEN
    RAISE EXCEPTION 'Cannot queue % without an account recipient (consent cannot be verified).', NEW.channel
      USING ERRCODE = 'check_violation';
  END IF;
  v_ok := CASE NEW.channel
    WHEN 'email'    THEN COALESCE((SELECT email_opt_in    FROM communication_preferences WHERE profile_id = NEW.recipient_id), true)
    WHEN 'whatsapp' THEN COALESCE((SELECT whatsapp_opt_in FROM communication_preferences WHERE profile_id = NEW.recipient_id), false)
    WHEN 'sms'      THEN COALESCE((SELECT sms_opt_in      FROM communication_preferences WHERE profile_id = NEW.recipient_id), false)
    ELSE false END;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'Recipient has not opted in to % messages.', NEW.channel USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER enforce_communication_consent_trg BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION enforce_communication_consent();

-- ===== Staff insert into the queue (compose/queue) =====
-- Staff with communications.send may queue a message linked to a record they can
-- access (the policy/lead/appointment subqueries are RLS-filtered to their scope).
CREATE POLICY notifications_insert_staff ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    has_permission('communications', 'send')
    AND created_by = auth.uid()
    AND (
      is_admin()
      OR (policy_id      IS NOT NULL AND policy_id      IN (SELECT id FROM policies))
      OR (lead_id        IS NOT NULL AND lead_id        IN (SELECT id FROM leads))
      OR (appointment_id IS NOT NULL AND appointment_id IN (SELECT id FROM appointments))
    )
  );

-- ===== Communication timeline → activity_logs =====
-- Logs queue + status changes against the linked entity (policy > lead > appointment),
-- so the event shows on that record's existing (RLS-scoped) timeline for RM + customer.
CREATE OR REPLACE FUNCTION trigger_log_communication()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_type TEXT; v_id UUID; v_action TEXT;
BEGIN
  IF    NEW.policy_id      IS NOT NULL THEN v_type := 'policy';      v_id := NEW.policy_id;
  ELSIF NEW.lead_id        IS NOT NULL THEN v_type := 'lead';        v_id := NEW.lead_id;
  ELSIF NEW.appointment_id IS NOT NULL THEN v_type := 'appointment'; v_id := NEW.appointment_id;
  ELSE  RETURN NEW;  -- no linked record to attach a timeline event to
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'communication.queued';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'communication.' || NEW.status;   -- sent/delivered/failed/read (M13 worker)
  ELSE
    RETURN NEW;
  END IF;

  PERFORM log_system_activity(v_type, v_id, v_action, COALESCE(NEW.created_by, auth.uid()),
    jsonb_build_object('channel', NEW.channel, 'category', NEW.category, 'notification_id', NEW.id));
  RETURN NEW;
END; $$;
CREATE TRIGGER log_communication_queued AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION trigger_log_communication();
CREATE TRIGGER log_communication_status AFTER UPDATE OF status ON notifications
  FOR EACH ROW EXECUTE FUNCTION trigger_log_communication();

-- ===== Permissions: communications resource =====
INSERT INTO permissions (resource, action, description) VALUES
  ('communications','send',            'Compose and queue a message'),
  ('communications','view_assigned',   'View own queued messages'),
  ('communications','view_team',       'View team members'' messages'),
  ('communications','view_branch',     'View all messages in the branch'),
  ('communications','view_all',        'View all messages'),
  ('communications','manage_templates','Manage message templates')
ON CONFLICT (resource, action) DO NOTHING;

DO $$
DECLARE r_bm UUID; r_sm UUID; r_tl UUID; r_rm UUID;
BEGIN
  SELECT id INTO r_bm FROM roles WHERE name='branch_manager';
  SELECT id INTO r_sm FROM roles WHERE name='sales_manager';
  SELECT id INTO r_tl FROM roles WHERE name='team_leader';
  SELECT id INTO r_rm FROM roles WHERE name='rm';

  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name='super_admin' AND p.resource='communications' ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.name='admin' AND p.resource='communications' ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_bm, id FROM permissions WHERE resource='communications'
      AND action IN ('send','view_branch') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_sm, id FROM permissions WHERE resource='communications'
      AND action IN ('send','view_team','view_branch') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_tl, id FROM permissions WHERE resource='communications'
      AND action IN ('send','view_assigned','view_team') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (role_id, permission_id)
    SELECT r_rm, id FROM permissions WHERE resource='communications'
      AND action IN ('send','view_assigned') ON CONFLICT DO NOTHING;
END $$;

-- ===== Seeded predefined templates (with {{variable}} body) =====
-- Channel-specific. body uses {{snake_case}} placeholders; required_variables drives validation.
INSERT INTO notification_templates (name, channel, category, language, subject, body_preview, body, required_variables, is_active)
VALUES
  ('Renewal reminder (email)','email','renewal_reminder','en',
   'Your policy {{policy_number}} is due for renewal',
   'Renewal reminder email',
   'Dear {{customer_name}},\n\nYour policy {{policy_number}} ({{insurer_name}}) is due for renewal on {{renewal_date}}. Please contact your relationship manager {{rm_name}} to renew.\n\nThank you,\nPolicyFynder',
   ARRAY['customer_name','policy_number','insurer_name','renewal_date','rm_name'], true),
  ('Renewal reminder (whatsapp)','whatsapp','renewal_reminder','en',
   NULL,'Renewal reminder whatsapp',
   'Hi {{customer_name}}, your policy {{policy_number}} renews on {{renewal_date}}. Reply to this message or contact {{rm_name}} to renew.',
   ARRAY['customer_name','policy_number','renewal_date','rm_name'], true),
  ('Renewal reminder (in-app)','in_app','renewal_reminder','en',
   'Policy renewal due','Renewal reminder in-app',
   'Your policy {{policy_number}} renews on {{renewal_date}}.',
   ARRAY['policy_number','renewal_date'], true),
  ('Welcome (email)','email','welcome','en',
   'Welcome to PolicyFynder, {{customer_name}}',
   'Welcome email',
   'Dear {{customer_name}},\n\nWelcome to PolicyFynder. Your relationship manager is {{rm_name}}. We''re here to help with all your insurance needs.',
   ARRAY['customer_name','rm_name'], true),
  ('Appointment confirmation (email)','email','appointment_confirmation','en',
   'Your appointment on {{appointment_date}} is confirmed',
   'Appointment confirmation email',
   'Dear {{customer_name}},\n\nYour appointment is confirmed for {{appointment_date}} at {{appointment_time}} with {{rm_name}}.',
   ARRAY['customer_name','appointment_date','appointment_time','rm_name'], true),
  ('Appointment reminder (whatsapp)','whatsapp','appointment_reminder','en',
   NULL,'Appointment reminder whatsapp',
   'Reminder: your appointment with {{rm_name}} is on {{appointment_date}} at {{appointment_time}}.',
   ARRAY['rm_name','appointment_date','appointment_time'], true),
  ('Appointment reminder (in-app)','in_app','appointment_reminder','en',
   'Upcoming appointment','Appointment reminder in-app',
   'You have an appointment on {{appointment_date}} at {{appointment_time}}.',
   ARRAY['appointment_date','appointment_time'], true),
  ('Policy issued (email)','email','policy_issued','en',
   'Your policy {{policy_number}} has been issued',
   'Policy issued email',
   'Dear {{customer_name}},\n\nYour policy {{policy_number}} ({{insurer_name}}) has been issued. Premium: {{premium}}.',
   ARRAY['customer_name','policy_number','insurer_name','premium'], true),
  ('Policy expiry (email)','email','policy_expiry','en',
   'Your policy {{policy_number}} expires on {{expiry_date}}',
   'Policy expiry email',
   'Dear {{customer_name}},\n\nYour policy {{policy_number}} expires on {{expiry_date}}. Contact {{rm_name}} to avoid a lapse in cover.',
   ARRAY['customer_name','policy_number','expiry_date','rm_name'], true),
  ('Follow-up (email)','email','follow_up','en',
   'Following up on your insurance',
   'Follow-up email',
   'Dear {{customer_name}},\n\n{{message}}\n\nRegards,\n{{rm_name}}',
   ARRAY['customer_name','message','rm_name'], true),
  ('Follow-up (in-app)','in_app','follow_up','en',
   'A note from your RM','Follow-up in-app',
   '{{message}}',
   ARRAY['message'], true),
  ('Claim update (email)','email','claim_update','en',
   'Update on your claim',
   'Claim update email',
   'Dear {{customer_name}},\n\nUpdate on your claim for policy {{policy_number}}: {{message}}',
   ARRAY['customer_name','policy_number','message'], true)
ON CONFLICT (name, channel, language) DO NOTHING;
