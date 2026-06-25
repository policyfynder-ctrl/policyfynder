-- Migration 7: Lead Enhancements
-- Adds follow-up tracking, SLA deadlines, priority, geographic data to leads.
-- Replaces lead_source enum with a lead_sources lookup table.
-- Removes appointment_in_future DB constraint (validation moves to application layer).
-- Adds service_areas to relationship_managers for geographic assignment routing.

-- ============================================================
-- LEAD SOURCES (replaces hardcoded lead_source enum)
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_sources (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL UNIQUE,
  slug                TEXT NOT NULL UNIQUE,
  channel_type        TEXT NOT NULL CHECK (
                        channel_type IN ('social', 'search', 'organic', 'referral', 'direct', 'other')
                      ),
  cost_per_lead_cents INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_lead_sources_updated_at
  BEFORE UPDATE ON lead_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed matching the existing lead_source enum values so existing records can be migrated
INSERT INTO lead_sources (name, slug, channel_type) VALUES
  ('Instagram', 'instagram', 'social'),
  ('Facebook',  'facebook',  'social'),
  ('Google',    'google',    'search'),
  ('Direct',    'direct',    'direct'),
  ('Referral',  'referral',  'referral'),
  ('Other',     'other',     'other')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- LEAD FOLLOW-UPS
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rm_id        UUID NOT NULL REFERENCES relationship_managers(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_lead_follow_ups_updated_at
  BEFORE UPDATE ON lead_follow_ups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ALTER leads: add follow-up, SLA, priority, geographic, and source FK
-- ============================================================

ALTER TABLE leads
  -- source_id FK to lead_sources (coexists with source enum during migration)
  ADD COLUMN IF NOT EXISTS source_id       UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  -- Follow-up and SLA
  ADD COLUMN IF NOT EXISTS follow_up_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ,
  -- Priority: 1=urgent, 2=high, 3=normal (default), 4=low, 5=deferred
  ADD COLUMN IF NOT EXISTS priority        SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS lead_score      INTEGER NOT NULL DEFAULT 0,
  -- Geographic data for routing and analytics
  ADD COLUMN IF NOT EXISTS city            TEXT,
  ADD COLUMN IF NOT EXISTS state           TEXT,
  ADD COLUMN IF NOT EXISTS postal_code     TEXT,
  ADD COLUMN IF NOT EXISTS country         TEXT NOT NULL DEFAULT 'IN';

-- Backfill source_id from the existing source enum
UPDATE leads l
SET source_id = ls.id
FROM lead_sources ls
WHERE l.source::TEXT = ls.slug
  AND l.source_id IS NULL;

-- ============================================================
-- ALTER relationship_managers: service areas for geographic routing
-- ============================================================

ALTER TABLE relationship_managers
  ADD COLUMN IF NOT EXISTS service_areas TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================
-- REMOVE appointment_in_future CONSTRAINT
-- The customer booking form validates this in application code.
-- Admin must be able to backfill, correct, or import historical appointments.
-- ============================================================

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointment_in_future;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE lead_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;

-- Lead sources are public (booking form reads them without auth)
CREATE POLICY "lead_sources_select_all" ON lead_sources
  FOR SELECT USING (is_active = true);

CREATE POLICY "lead_sources_select_admin" ON lead_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "lead_sources_manage_admin" ON lead_sources
  FOR ALL TO authenticated USING (is_admin());

-- Lead follow-ups: RM sees their own; admin sees all
CREATE POLICY "lead_follow_ups_select" ON lead_follow_ups
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR rm_id = get_rm_id()
  );

CREATE POLICY "lead_follow_ups_insert" ON lead_follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (rm_id = get_rm_id() OR is_admin());

CREATE POLICY "lead_follow_ups_update" ON lead_follow_ups
  FOR UPDATE TO authenticated
  USING (rm_id = get_rm_id() OR is_admin());
