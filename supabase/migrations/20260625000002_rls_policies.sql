-- ============================================================
-- PolicyFynder — Migration 002: Row Level Security Policies
-- ============================================================
-- Applies after 001_initial_schema.sql
-- Every table has RLS enabled. Policies enforce least-privilege.
-- ============================================================


-- ============================================================
-- HELPER: Role-check functions
-- These are called inside policies. SECURITY DEFINER means
-- they run as the function owner, not the calling user.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_rm()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'rm'
      AND deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_rm_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_rm_id UUID;
BEGIN
  SELECT rm.id INTO v_rm_id
  FROM relationship_managers rm
  WHERE rm.profile_id = auth.uid()
    AND rm.deleted_at IS NULL;
  RETURN v_rm_id;
END;
$$;


-- ============================================================
-- TABLE: profiles
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admins see everyone
CREATE POLICY "admin_all_profiles"
  ON profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can read and update their own profile
CREATE POLICY "user_own_profile_select"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "user_own_profile_update"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ============================================================
-- TABLE: branches
-- ============================================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_branches"
  ON branches FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anonymous users can read active branches (booking page resolves /book/[branch] without auth)
CREATE POLICY "anon_read_active_branches"
  ON branches FOR SELECT
  USING (is_active = true);

-- Authenticated users can read all branches, including inactive (admin views)
CREATE POLICY "authenticated_read_all_branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);


-- ============================================================
-- TABLE: insurance_products
-- ============================================================

ALTER TABLE insurance_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_products"
  ON insurance_products FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone (including anonymous booking page visitors) can read products
CREATE POLICY "public_read_products"
  ON insurance_products FOR SELECT
  USING (true);


-- ============================================================
-- TABLE: relationship_managers
-- ============================================================

ALTER TABLE relationship_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_rms"
  ON relationship_managers FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RMs can see their own record
CREATE POLICY "rm_own_record"
  ON relationship_managers FOR SELECT
  USING (profile_id = auth.uid());

-- Anyone can see active RMs (needed for booking page capacity display)
CREATE POLICY "public_read_active_rms"
  ON relationship_managers FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);


-- ============================================================
-- TABLE: rm_specializations
-- ============================================================

ALTER TABLE rm_specializations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_specializations"
  ON rm_specializations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "rm_own_specializations"
  ON rm_specializations FOR SELECT
  USING (rm_id = get_rm_id());

CREATE POLICY "public_read_specializations"
  ON rm_specializations FOR SELECT
  USING (true);


-- ============================================================
-- TABLE: rm_schedules
-- ============================================================

ALTER TABLE rm_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_schedules"
  ON rm_schedules FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "rm_own_schedules"
  ON rm_schedules FOR SELECT
  USING (rm_id = get_rm_id());

-- Public read is needed so the booking page can calculate capacity
CREATE POLICY "public_read_schedules"
  ON rm_schedules FOR SELECT
  USING (true);


-- ============================================================
-- TABLE: rm_leave
-- ============================================================

ALTER TABLE rm_leave ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_leave"
  ON rm_leave FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RMs can manage their own leave
CREATE POLICY "rm_own_leave_select"
  ON rm_leave FOR SELECT
  USING (rm_id = get_rm_id());

CREATE POLICY "rm_own_leave_insert"
  ON rm_leave FOR INSERT
  WITH CHECK (rm_id = get_rm_id());

CREATE POLICY "rm_own_leave_update"
  ON rm_leave FOR UPDATE
  USING (rm_id = get_rm_id())
  WITH CHECK (rm_id = get_rm_id());

CREATE POLICY "rm_own_leave_delete"
  ON rm_leave FOR DELETE
  USING (rm_id = get_rm_id());


-- ============================================================
-- TABLE: leads
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_leads"
  ON leads FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RMs can only see and update leads assigned to them
CREATE POLICY "rm_assigned_leads_select"
  ON leads FOR SELECT
  USING (is_rm() AND assigned_rm_id = get_rm_id());

CREATE POLICY "rm_assigned_leads_update"
  ON leads FOR UPDATE
  USING (is_rm() AND assigned_rm_id = get_rm_id())
  WITH CHECK (assigned_rm_id = get_rm_id());

-- Customers see only their own lead record
CREATE POLICY "customer_own_lead_select"
  ON leads FOR SELECT
  USING (customer_profile_id = auth.uid());

-- Anonymous visitors (booking page) can create leads
CREATE POLICY "anon_insert_lead"
  ON leads FOR INSERT
  WITH CHECK (true);


-- ============================================================
-- TABLE: appointments
-- ============================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_appointments"
  ON appointments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RMs see and update their own appointments
CREATE POLICY "rm_own_appointments_select"
  ON appointments FOR SELECT
  USING (is_rm() AND rm_id = get_rm_id());

CREATE POLICY "rm_own_appointments_update"
  ON appointments FOR UPDATE
  USING (is_rm() AND rm_id = get_rm_id())
  WITH CHECK (rm_id = get_rm_id());

-- Customers see their own appointment (via lead)
CREATE POLICY "customer_own_appointment_select"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = appointments.lead_id
        AND leads.customer_profile_id = auth.uid()
    )
  );

-- Customers can update their own appointment (e.g. cancel)
CREATE POLICY "customer_own_appointment_update"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = appointments.lead_id
        AND leads.customer_profile_id = auth.uid()
    )
  );

-- Anyone (booking page) can create an appointment
CREATE POLICY "anon_insert_appointment"
  ON appointments FOR INSERT
  WITH CHECK (true);


-- ============================================================
-- TABLE: lead_assignments
-- ============================================================

ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_assignments"
  ON lead_assignments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "rm_own_assignments_select"
  ON lead_assignments FOR SELECT
  USING (is_rm() AND rm_id = get_rm_id());


-- ============================================================
-- TABLE: lead_notes
-- ============================================================

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_notes"
  ON lead_notes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- RMs can CRUD notes on their assigned leads
CREATE POLICY "rm_notes_select"
  ON lead_notes FOR SELECT
  USING (
    is_rm() AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_notes.lead_id
        AND leads.assigned_rm_id = get_rm_id()
    )
  );

CREATE POLICY "rm_notes_insert"
  ON lead_notes FOR INSERT
  WITH CHECK (
    is_rm()
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_notes.lead_id
        AND leads.assigned_rm_id = get_rm_id()
    )
  );

CREATE POLICY "rm_notes_update"
  ON lead_notes FOR UPDATE
  USING (is_rm() AND author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "rm_notes_delete"
  ON lead_notes FOR DELETE
  USING (is_rm() AND author_id = auth.uid());


-- ============================================================
-- TABLE: lead_stage_history
-- ============================================================

ALTER TABLE lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_stage_history"
  ON lead_stage_history FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "rm_stage_history_select"
  ON lead_stage_history FOR SELECT
  USING (
    is_rm() AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_stage_history.lead_id
        AND leads.assigned_rm_id = get_rm_id()
    )
  );


-- ============================================================
-- TABLE: notifications
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_notifications"
  ON notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "user_own_notifications_select"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());


-- ============================================================
-- TABLE: activity_logs
-- ============================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log
CREATE POLICY "admin_read_activity_logs"
  ON activity_logs FOR SELECT
  USING (is_admin());

-- Anyone authenticated can append to the log (via SECURITY DEFINER functions only)
CREATE POLICY "authenticated_insert_activity_logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
