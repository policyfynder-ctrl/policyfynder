-- Migration 17: don't re-check capacity on status-only appointment updates
-- ============================================================
-- The capacity trigger (check_appointment_capacity) fires BEFORE INSERT OR UPDATE.
-- On a status-only update (e.g. scheduled → confirmed/completed) it re-ran
-- get_slot_availability for the SAME slot, which counts the appointment being
-- updated against itself → availability 0 → "No capacity" → the update failed.
-- Net effect: appointments could never be confirmed or completed.
--
-- Fix: skip the capacity check on UPDATE when the slot (date/time) and RM are
-- unchanged — the slot was already validated at booking, so a status/notes edit
-- must not be re-validated. INSERTs and genuine slot changes are still checked.
-- ============================================================

CREATE OR REPLACE FUNCTION check_appointment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_availability INTEGER;
BEGIN
  -- Cancellations / no-shows / reschedules free capacity; never block them.
  IF TG_OP = 'UPDATE' AND NEW.status IN ('cancelled', 'no_show', 'rescheduled') THEN
    RETURN NEW;
  END IF;

  -- Status/notes-only update (same slot, same RM): already validated at booking.
  IF TG_OP = 'UPDATE'
     AND NEW.appointment_date = OLD.appointment_date
     AND NEW.start_time = OLD.start_time
     AND NEW.rm_id = OLD.rm_id THEN
    RETURN NEW;
  END IF;

  -- INSERT, or an UPDATE that moves the appointment: enforce branch capacity.
  v_availability := get_slot_availability(NEW.appointment_date, NEW.start_time, NEW.branch_id);
  IF v_availability <= 0 THEN
    RAISE EXCEPTION 'No capacity available for % on %. All RMs are fully booked.',
      NEW.start_time::TEXT, NEW.appointment_date::TEXT
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
