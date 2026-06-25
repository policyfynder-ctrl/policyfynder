-- Migration 5: Organisational Structure
-- Adds teams and team_members tables.
-- Adds team_id to relationship_managers.
-- Adds branch_id to leads and appointments (with backfill from RM's branch).

-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS teams (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  team_leader_rm_id UUID REFERENCES relationship_managers(id) ON DELETE SET NULL,
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE(branch_id, name)
);

CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TEAM_MEMBERS (history-preserving — left_at records when RM left the team)
-- ============================================================

CREATE TABLE IF NOT EXISTS team_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rm_id      UUID NOT NULL REFERENCES relationship_managers(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at    TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT team_members_dates_valid CHECK (left_at IS NULL OR left_at > joined_at)
);

-- Enforce: one active team membership per RM at a time
CREATE UNIQUE INDEX idx_team_members_active_unique
  ON team_members(rm_id)
  WHERE is_current = true AND left_at IS NULL;

-- ============================================================
-- ALTER relationship_managers: add team_id
-- ============================================================

ALTER TABLE relationship_managers
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================================
-- ALTER leads: add branch_id
-- The booking page will set branch_id on new leads.
-- Existing leads are backfilled from assigned RM's branch.
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

UPDATE leads l
SET branch_id = rm.branch_id
FROM relationship_managers rm
WHERE l.assigned_rm_id = rm.id
  AND l.branch_id IS NULL;

-- ============================================================
-- ALTER appointments: add branch_id (denormalised for reporting)
-- ============================================================

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

UPDATE appointments a
SET branch_id = rm.branch_id
FROM relationship_managers rm
WHERE a.rm_id = rm.id
  AND a.branch_id IS NULL;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read teams (branch-scoped visibility enforced in RLS v2)
CREATE POLICY "teams_select_authenticated" ON teams
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "teams_manage_admin" ON teams
  FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "team_members_select_authenticated" ON team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members_manage_admin" ON team_members
  FOR ALL TO authenticated USING (is_admin());
