-- Migration 6: Capacity Configuration
-- Replaces hardcoded working hours in v_slot_availability with a config table.
-- Makes get_slot_capacity and get_slot_availability branch-aware.
-- Fixes get_slot_capacity to handle custom leave type correctly.

-- ============================================================
-- WORKING HOURS CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS working_hours_config (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id             UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = all branches
  day_of_week           SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  slot_start            TIME NOT NULL,
  slot_duration_minutes SMALLINT NOT NULL DEFAULT 60 CHECK (slot_duration_minutes > 0),
  effective_from        DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until       DATE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT working_hours_dates_valid CHECK (
    effective_until IS NULL OR effective_until > effective_from
  )
);

-- ============================================================
-- BRANCH HOLIDAYS
-- ============================================================

CREATE TABLE IF NOT EXISTS branch_holidays (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = applies to all branches
  holiday_date DATE NOT NULL,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, holiday_date)
);

-- ============================================================
-- SEED: DEFAULT WORKING HOURS (Head Office, Mon-Fri 10:00-18:00, 60-min slots)
-- ============================================================

DO $$
DECLARE
  v_branch_id UUID;
  v_day       INTEGER;
  v_slot      TIME;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  FOR v_day IN 1..5 LOOP
    v_slot := '10:00'::TIME;
    WHILE v_slot < '18:00'::TIME LOOP
      INSERT INTO working_hours_config (branch_id, day_of_week, slot_start, slot_duration_minutes, effective_from)
      VALUES (v_branch_id, v_day, v_slot, 60, CURRENT_DATE)
      ON CONFLICT DO NOTHING;
      v_slot := v_slot + '1 hour'::INTERVAL;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- REPLACE get_slot_capacity — branch-aware
-- Signature is backward-compatible: p_branch_id defaults to NULL (all branches).
-- NOTE: morning/afternoon leave_type values are deprecated.
--       Use leave_type = 'custom' with explicit start_time/end_time for partial-day leave.
--       Morning/afternoon are handled here only for backward compat with existing records.
-- ============================================================

CREATE OR REPLACE FUNCTION get_slot_capacity(
  p_date       DATE,
  p_start_time TIME,
  p_branch_id  UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM relationship_managers rm
  WHERE rm.is_active = true
    AND (p_branch_id IS NULL OR rm.branch_id = p_branch_id)
    AND EXISTS (
      SELECT 1 FROM rm_schedules rs
      WHERE rs.rm_id = rm.id
        AND rs.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
        AND rs.start_time <= p_start_time
        AND rs.end_time > p_start_time
        AND rs.is_active = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM rm_leave rl
      WHERE rl.rm_id = rm.id
        AND rl.leave_date = p_date
        AND (
          rl.leave_type = 'full_day'
          -- morning: backward compat for pre-existing records
          OR (rl.leave_type = 'morning'   AND p_start_time >= '10:00' AND p_start_time < '13:00')
          -- afternoon: backward compat for pre-existing records
          OR (rl.leave_type = 'afternoon' AND p_start_time >= '13:00')
          OR (
            rl.leave_type = 'custom'
            AND rl.start_time IS NOT NULL
            AND rl.end_time IS NOT NULL
            AND rl.start_time <= p_start_time
            AND rl.end_time > p_start_time
          )
        )
    );
$$;

-- ============================================================
-- REPLACE get_slot_availability — branch-aware
-- ============================================================

CREATE OR REPLACE FUNCTION get_slot_availability(
  p_date       DATE,
  p_start_time TIME,
  p_branch_id  UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT GREATEST(
    0,
    get_slot_capacity(p_date, p_start_time, p_branch_id) - (
      SELECT COUNT(*)::INTEGER
      FROM appointments a
      JOIN relationship_managers rm ON rm.id = a.rm_id
      WHERE a.appointment_date = p_date
        AND a.start_time = p_start_time
        AND a.status NOT IN ('cancelled', 'no_show')
        AND a.deleted_at IS NULL
        AND (p_branch_id IS NULL OR rm.branch_id = p_branch_id)
    )
  );
$$;

-- ============================================================
-- REPLACE v_slot_availability — config-driven and branch-aware
-- Replaces the hardcoded 9-slot view.
-- Joins on working_hours_config so adding/changing hours requires only a config row,
-- not a view rewrite.
-- ============================================================

DROP VIEW IF EXISTS v_slot_availability;

CREATE VIEW v_slot_availability AS
SELECT
  d.slot_date,
  whc.slot_start,
  (whc.slot_start + (whc.slot_duration_minutes || ' minutes')::INTERVAL)::TIME AS slot_end,
  whc.branch_id,
  get_slot_capacity(d.slot_date, whc.slot_start, whc.branch_id)     AS total_capacity,
  get_slot_availability(d.slot_date, whc.slot_start, whc.branch_id) AS available_spots
FROM
  -- generate_series with a date + interval step returns timestamps; cast to
  -- date so d.slot_date matches the get_slot_* (DATE, TIME, UUID) signatures
  -- and compares cleanly against the DATE columns below.
  (
    SELECT generate_series(
      CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', INTERVAL '1 day'
    )::date AS slot_date
  ) d
  JOIN working_hours_config whc ON
    EXTRACT(DOW FROM d.slot_date)::SMALLINT = whc.day_of_week
    AND whc.is_active = true
    AND d.slot_date >= whc.effective_from
    AND (whc.effective_until IS NULL OR d.slot_date <= whc.effective_until)
WHERE
  NOT EXISTS (
    SELECT 1 FROM branch_holidays bh
    WHERE (bh.branch_id = whc.branch_id OR bh.branch_id IS NULL)
      AND bh.holiday_date = d.slot_date
  );

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE working_hours_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_holidays       ENABLE ROW LEVEL SECURITY;

-- Working hours are public (needed by the anonymous booking page)
CREATE POLICY "working_hours_select_all" ON working_hours_config
  FOR SELECT USING (true);

CREATE POLICY "working_hours_manage_admin" ON working_hours_config
  FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "branch_holidays_select_all" ON branch_holidays
  FOR SELECT USING (true);

CREATE POLICY "branch_holidays_manage_admin" ON branch_holidays
  FOR ALL TO authenticated USING (is_admin());
