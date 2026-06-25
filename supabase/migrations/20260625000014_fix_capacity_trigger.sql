-- Migration 14: fix ambiguous capacity function calls
-- ============================================================
-- Migration 006 added branch-aware get_slot_capacity/get_slot_availability with a
-- `p_branch_id UUID DEFAULT NULL` third argument, alongside the original 2-arg
-- versions from migration 001. Because the 3-arg versions have a default, ANY
-- 2-argument call matches BOTH candidates:
--     ERROR: function get_slot_availability(date, time) is not unique
-- The capacity trigger (check_appointment_capacity) calls the 2-arg form, so EVERY
-- appointment INSERT/UPDATE was failing — i.e. no booking could ever succeed. This
-- went unnoticed until the public booking flow exercised the trigger.
--
-- Fix: make the trigger call the branch-aware 3-arg version explicitly (NULL branch
-- still means "all branches"), then drop the now-redundant 2-arg overloads so no
-- ambiguous call sites remain. The config-driven view already uses the 3-arg form.
-- ============================================================

CREATE OR REPLACE FUNCTION check_appointment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_availability INTEGER;
BEGIN
  -- Skip the check for cancellations / no-shows / reschedules.
  IF TG_OP = 'UPDATE' AND NEW.status IN ('cancelled', 'no_show', 'rescheduled') THEN
    RETURN NEW;
  END IF;

  -- Branch-aware availability (NEW.branch_id may be NULL → counted across all branches).
  v_availability := get_slot_availability(NEW.appointment_date, NEW.start_time, NEW.branch_id);

  IF v_availability <= 0 THEN
    RAISE EXCEPTION 'No capacity available for % on %. All RMs are fully booked.',
      NEW.start_time::TEXT, NEW.appointment_date::TEXT
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove the ambiguous 2-arg overloads (drop availability first — it calls capacity).
DROP FUNCTION IF EXISTS get_slot_availability(DATE, TIME);
DROP FUNCTION IF EXISTS get_slot_capacity(DATE, TIME);
