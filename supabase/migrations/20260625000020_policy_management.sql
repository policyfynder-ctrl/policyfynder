-- Migration 20: Policy Management — schema, RLS, audit
-- ============================================================
-- Adds the Policy module: the central record that links a customer (lead),
-- product, insurer, RM, branch, and (optionally) the originating appointment.
-- Mirrors existing conventions throughout:
--   * soft delete via deleted_at + partial indexes
--   * denormalised holder contact (like leads) so staff never need to read the
--     self+admin-only profiles table
--   * RLS = base (is_admin/is_rm/get_rm_id) + hierarchy (get_accessible_*_ids)
--   * DB-level audit via log_system_activity() SECURITY DEFINER triggers
-- policy_number is the INSURER's real number (entered by the RM) — required and
-- unique; we never generate our own. PolicyFynder is NOT a payment gateway: it
-- does not collect or track payments. premium_cents / sum_assured_cents are
-- REFERENCE values only (what the insurer's policy says) — never a billing ledger.
-- renewal_date drives the renewal pipeline (reminders, RM follow-up); when a
-- renewal is actioned, renewal_completed_at records it (powers "renewals completed").
-- ============================================================

-- ===== ENUMS =====
CREATE TYPE policy_status AS ENUM ('draft','active','lapsed','cancelled','expired');

-- ===== TABLE: insurers (carriers) =====
CREATE TABLE insurers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO insurers (name, slug) VALUES
  ('LIC','lic'), ('HDFC Ergo','hdfc-ergo'), ('ICICI Lombard','icici-lombard'),
  ('Bajaj Allianz','bajaj-allianz'), ('Star Health','star-health'), ('Tata AIG','tata-aig');

-- ===== TABLE: policies =====
CREATE TABLE policies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number       TEXT NOT NULL UNIQUE,            -- insurer's real number, entered by RM
  -- central links
  customer_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  product_id          UUID NOT NULL REFERENCES insurance_products(id) ON DELETE RESTRICT,
  insurer_id          UUID NOT NULL REFERENCES insurers(id) ON DELETE RESTRICT,
  assigned_rm_id      UUID REFERENCES relationship_managers(id),
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- denormalised holder contact (mirrors leads; avoids profiles RLS dependency)
  holder_name         TEXT NOT NULL,
  holder_email        TEXT,
  holder_phone        TEXT,
  -- details (premium/sum assured are REFERENCE figures only — no payment tracking)
  policy_type         TEXT,
  premium_cents       BIGINT CHECK (premium_cents     IS NULL OR premium_cents     >= 0),
  sum_assured_cents   BIGINT CHECK (sum_assured_cents IS NULL OR sum_assured_cents >= 0),
  status              policy_status NOT NULL DEFAULT 'draft',
  issue_date          DATE,
  start_date          DATE,
  expiry_date         DATE,
  renewal_date          DATE,                          -- drives renewal reminders / RM follow-up
  renewal_completed_at  DATE,                          -- set when a renewal is actioned/completed
  last_contacted_at     DATE,                          -- last RM ↔ customer contact on this policy
  notes               TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT valid_policy_dates
    CHECK (expiry_date IS NULL OR start_date IS NULL OR expiry_date >= start_date)
);

CREATE TRIGGER set_policies_updated_at
  BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== INDEXES (partial on active rows; mirrors 003/010) =====
CREATE INDEX idx_policies_assigned_rm ON policies(assigned_rm_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_branch      ON policies(branch_id)           WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_customer    ON policies(customer_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_lead        ON policies(lead_id);
CREATE INDEX idx_policies_insurer     ON policies(insurer_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_product     ON policies(product_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_status      ON policies(status)              WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_expiry      ON policies(expiry_date)          WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_renewal     ON policies(renewal_date)         WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_renewal_done ON policies(renewal_completed_at) WHERE deleted_at IS NULL;

-- ===== RLS: insurers (mirror insurance_products) =====
ALTER TABLE insurers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_insurers" ON insurers FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "public_read_insurers" ON insurers FOR SELECT USING (true);

-- ===== RLS: policies (mirror leads base + migration 009 hierarchy) =====
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_policies" ON policies FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "rm_assigned_policies_select" ON policies FOR SELECT
  USING (is_rm() AND assigned_rm_id = get_rm_id());

CREATE POLICY "rm_assigned_policies_update" ON policies FOR UPDATE
  USING (is_rm() AND assigned_rm_id = get_rm_id())
  WITH CHECK (assigned_rm_id = get_rm_id());

CREATE POLICY "customer_own_policies_select" ON policies FOR SELECT
  USING (customer_profile_id = auth.uid());

CREATE POLICY "policies_select_hierarchy" ON policies FOR SELECT TO authenticated
  USING (branch_id = ANY(get_accessible_branch_ids())
         OR assigned_rm_id = ANY(get_accessible_rm_ids()));

CREATE POLICY "policies_update_hierarchy" ON policies FOR UPDATE TO authenticated
  USING (branch_id = ANY(get_accessible_branch_ids())
         OR assigned_rm_id = ANY(get_accessible_rm_ids()))
  WITH CHECK (branch_id = ANY(get_accessible_branch_ids())
         OR assigned_rm_id = ANY(get_accessible_rm_ids()));

CREATE POLICY "policies_insert_scoped" ON policies FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (is_rm() AND assigned_rm_id = get_rm_id())
    OR (has_permission('policies','create')
        AND (branch_id = ANY(get_accessible_branch_ids())
             OR assigned_rm_id = ANY(get_accessible_rm_ids())))
  );

-- ===== activity_logs scoped read: add 'policy' (extends migration 016) =====
DROP POLICY IF EXISTS "activity_logs_select_scoped" ON activity_logs;
CREATE POLICY "activity_logs_select_scoped" ON activity_logs FOR SELECT TO authenticated
  USING (
    is_admin()
    OR actor_id = auth.uid()
    OR (entity_type = 'appointment' AND entity_id IN (SELECT id FROM appointments))
    OR (entity_type = 'lead'        AND entity_id IN (SELECT id FROM leads))
    OR (entity_type = 'policy'      AND entity_id IN (SELECT id FROM policies))
  );

-- ===== AUDIT TRIGGERS (mirror leads/appointments) =====
CREATE OR REPLACE FUNCTION trigger_log_policy_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_system_activity('policy', NEW.id, 'policy.created', auth.uid(),
    jsonb_build_object('policy_number', NEW.policy_number, 'status', NEW.status,
      'insurer_id', NEW.insurer_id, 'product_id', NEW.product_id, 'branch_id', NEW.branch_id));
  RETURN NEW;
END; $$;
CREATE TRIGGER log_policy_created AFTER INSERT ON policies
  FOR EACH ROW EXECUTE FUNCTION trigger_log_policy_created();

CREATE OR REPLACE FUNCTION trigger_log_policy_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.assigned_rm_id IS DISTINCT FROM NEW.assigned_rm_id THEN
    PERFORM log_system_activity('policy', NEW.id, 'policy.assigned', auth.uid(),
      jsonb_build_object('from_rm_id', OLD.assigned_rm_id, 'to_rm_id', NEW.assigned_rm_id));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER log_policy_assigned AFTER UPDATE OF assigned_rm_id ON policies
  FOR EACH ROW EXECUTE FUNCTION trigger_log_policy_assigned();

CREATE OR REPLACE FUNCTION trigger_log_policy_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_system_activity('policy', NEW.id, 'policy.status_changed', auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER log_policy_status_changed AFTER UPDATE OF status ON policies
  FOR EACH ROW EXECUTE FUNCTION trigger_log_policy_status_changed();

-- soft-delete + general field update (premium / sum assured / expiry / renewal / frequency)
CREATE OR REPLACE FUNCTION trigger_log_policy_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM log_system_activity('policy', NEW.id, 'policy.deleted', auth.uid(),
      jsonb_build_object('policy_number', NEW.policy_number));
    RETURN NEW;
  END IF;
  IF (OLD.premium_cents        IS DISTINCT FROM NEW.premium_cents)
     OR (OLD.sum_assured_cents    IS DISTINCT FROM NEW.sum_assured_cents)
     OR (OLD.expiry_date          IS DISTINCT FROM NEW.expiry_date)
     OR (OLD.renewal_date         IS DISTINCT FROM NEW.renewal_date)
     OR (OLD.renewal_completed_at IS DISTINCT FROM NEW.renewal_completed_at)
     OR (OLD.last_contacted_at    IS DISTINCT FROM NEW.last_contacted_at) THEN
    PERFORM log_system_activity('policy', NEW.id, 'policy.updated', auth.uid(),
      jsonb_build_object(
        'premium_changed',          OLD.premium_cents        IS DISTINCT FROM NEW.premium_cents,
        'sum_assured_changed',      OLD.sum_assured_cents    IS DISTINCT FROM NEW.sum_assured_cents,
        'expiry_changed',           OLD.expiry_date          IS DISTINCT FROM NEW.expiry_date,
        'renewal_changed',          OLD.renewal_date         IS DISTINCT FROM NEW.renewal_date,
        'renewal_completed_changed', OLD.renewal_completed_at IS DISTINCT FROM NEW.renewal_completed_at,
        'last_contacted_changed',   OLD.last_contacted_at    IS DISTINCT FROM NEW.last_contacted_at));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER log_policy_updated AFTER UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION trigger_log_policy_updated();

-- ===== GRANTS (explicit; default privileges from 013 already cover new tables) =====
GRANT SELECT, INSERT, UPDATE, DELETE ON insurers, policies TO anon, authenticated, service_role;
