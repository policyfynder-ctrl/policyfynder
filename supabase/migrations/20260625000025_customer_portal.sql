-- Migration 25: Customer Portal
-- ============================================================
-- Milestone 11. Enables customers to access ONLY their own records:
--   * link_customer_account() — connects a customer's auth profile to their
--     existing leads/policies by confirmed email (appointments follow via lead).
--   * Security hardening: a profiles trigger blocks role/email self-escalation
--     (is_admin() reads profiles.role, so an unguarded self-update was a privilege
--     escalation path).
--   * get_customer_rm() — the caller's assigned RM contact, scoped to their own
--     policies (no broad profiles exposure).
--   * appointment_change_requests — customers REQUEST cancel/reschedule; an RM
--     approves. Customers' direct appointment-update RLS is removed.
-- No admin bypass; RLS remains the boundary throughout.
-- ============================================================

-- ===== (B) Email-based account linking =====
CREATE OR REPLACE FUNCTION link_customer_account(p_profile_id UUID, p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN RETURN; END IF;
  -- Only ever claim UNLINKED rows whose email matches exactly (case-insensitive).
  UPDATE leads SET customer_profile_id = p_profile_id
    WHERE customer_profile_id IS NULL AND lower(email) = lower(p_email);
  UPDATE policies SET customer_profile_id = p_profile_id
    WHERE customer_profile_id IS NULL AND lower(holder_email) = lower(p_email);
END; $$;

-- Extend signup handler to link on account creation (preserves prior behaviour).
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role_id UUID;
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  SELECT id INTO v_role_id FROM roles WHERE name = 'customer';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO user_roles (profile_id, role_id, scope_type) VALUES (NEW.id, v_role_id, 'global');
  END IF;

  PERFORM link_customer_account(NEW.id, NEW.email);
  RETURN NEW;
END; $$;

-- One-time backfill for existing customer accounts.
UPDATE leads l SET customer_profile_id = p.id
  FROM profiles p
  WHERE l.customer_profile_id IS NULL AND p.role = 'customer' AND lower(l.email) = lower(p.email);
UPDATE policies po SET customer_profile_id = p.id
  FROM profiles p
  WHERE po.customer_profile_id IS NULL AND p.role = 'customer' AND lower(po.holder_email) = lower(p.email);

CREATE INDEX IF NOT EXISTS idx_policies_holder_email ON policies(lower(holder_email)) WHERE deleted_at IS NULL;

-- ===== (A) Privilege-escalation guard on profiles =====
-- NOT SECURITY DEFINER: current_user reflects the real caller role, so the admin
-- API (service_role) and migrations (postgres) can still set roles, while an
-- authenticated end-user cannot change their own role/email. is_admin() lets a
-- genuine admin user through.
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'You are not allowed to change your role.' USING ERRCODE = 'check_violation';
    END IF;
    NEW.email := OLD.email; -- email is managed via auth, not profile edits
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER protect_profile_columns_trg
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_columns();

-- ===== (C) Customer's assigned RM contact (scoped to their policies) =====
CREATE OR REPLACE FUNCTION get_customer_rm()
RETURNS TABLE (rm_name TEXT, email TEXT, phone TEXT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT pr.full_name, pr.email, pr.phone
  FROM policies po
  JOIN relationship_managers rm ON rm.id = po.assigned_rm_id
  JOIN profiles pr ON pr.id = rm.profile_id
  WHERE po.customer_profile_id = auth.uid() AND po.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION get_customer_rm() TO authenticated;

-- ===== (A/D) Appointment change requests =====
CREATE TABLE appointment_change_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  requested_by   UUID REFERENCES profiles(id),
  type           TEXT NOT NULL CHECK (type IN ('cancel', 'reschedule')),
  preferred_date DATE,
  preferred_time TIME,
  reason         TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ,
  resolved_by    UUID REFERENCES profiles(id)
);
CREATE INDEX idx_acr_appointment ON appointment_change_requests(appointment_id);
CREATE INDEX idx_acr_pending ON appointment_change_requests(status) WHERE status = 'pending';

ALTER TABLE appointment_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_acr ON appointment_change_requests FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Customer may file a request for THEIR OWN appointment, and read their requests.
CREATE POLICY acr_customer_insert ON appointment_change_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a JOIN leads l ON l.id = a.lead_id
      WHERE a.id = appointment_id AND l.customer_profile_id = auth.uid()
    )
  );
CREATE POLICY acr_customer_select ON appointment_change_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

-- RM/manager may read + resolve requests for appointments in their scope.
CREATE POLICY acr_staff_select ON appointment_change_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a WHERE a.id = appointment_id
      AND (a.rm_id = get_rm_id()
           OR a.rm_id = ANY(get_accessible_rm_ids())
           OR a.branch_id = ANY(get_accessible_branch_ids()))
  ));
CREATE POLICY acr_staff_update ON appointment_change_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a WHERE a.id = appointment_id
      AND (a.rm_id = get_rm_id()
           OR a.rm_id = ANY(get_accessible_rm_ids())
           OR a.branch_id = ANY(get_accessible_branch_ids()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM appointments a WHERE a.id = appointment_id
      AND (a.rm_id = get_rm_id()
           OR a.rm_id = ANY(get_accessible_rm_ids())
           OR a.branch_id = ANY(get_accessible_branch_ids()))
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON appointment_change_requests TO anon, authenticated, service_role;

-- Audit: log the request + its resolution against the appointment timeline.
CREATE OR REPLACE FUNCTION trigger_log_acr()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_system_activity('appointment', NEW.appointment_id, 'appointment.change_requested',
      NEW.requested_by, jsonb_build_object('type', NEW.type, 'request_id', NEW.id));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_system_activity('appointment', NEW.appointment_id, 'appointment.change_' || NEW.status,
      auth.uid(), jsonb_build_object('type', NEW.type, 'request_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER log_acr_insert AFTER INSERT ON appointment_change_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_log_acr();
CREATE TRIGGER log_acr_update AFTER UPDATE ON appointment_change_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_log_acr();

-- Extend scoped activity read to nothing new (entity_type='appointment' already covered).

-- ===== (B/D) Remove customers' DIRECT appointment mutation — requests only =====
DROP POLICY IF EXISTS "customer_own_appointment_update" ON appointments;
