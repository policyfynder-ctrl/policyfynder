-- ============================================================
-- PolicyFynder — Migration 001: Initial Schema
-- ============================================================
-- Run order: 001 → 002 → 003
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'rm',
  'customer'
);

CREATE TYPE lead_status AS ENUM (
  'new',
  'scheduled',
  'contacted',
  'proposal_sent',
  'converted',
  'lost'
);

CREATE TYPE lead_source AS ENUM (
  'instagram',
  'facebook',
  'google',
  'direct',
  'referral',
  'other'
);

CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled'
);

CREATE TYPE assignment_method AS ENUM (
  'manual',
  'round_robin',
  'least_busy',
  'specialist',
  'geographic',
  'system'
);

CREATE TYPE note_type AS ENUM (
  'general',
  'call',
  'meeting',
  'follow_up',
  'internal'
);

CREATE TYPE leave_type AS ENUM (
  'full_day',
  'morning',
  'afternoon',
  'custom'
);

CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'whatsapp',
  'in_app'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'read'
);

CREATE TYPE notification_type AS ENUM (
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_cancelled',
  'lead_assigned',
  'lead_updated',
  'follow_up'
);


-- ============================================================
-- SHARED: updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLE: branches
-- Future multi-branch support. Start with one default branch.
-- ============================================================

CREATE TABLE branches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  code        TEXT        UNIQUE,  -- URL slug used in /book/[branch] and as external identifier
  address     TEXT,
  timezone    TEXT        NOT NULL DEFAULT 'Asia/Kolkata',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the default branch
INSERT INTO branches (name, code, timezone)
VALUES ('Head Office', 'head-office', 'Asia/Kolkata');


-- ============================================================
-- TABLE: profiles
-- Mirrors auth.users. Auto-created by trigger on signup.
-- ============================================================

CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'customer',
  full_name   TEXT,
  email       TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();


-- ============================================================
-- TABLE: insurance_products
-- Catalog of insurance lines. Drives RM specialization routing.
-- ============================================================

CREATE TABLE insurance_products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO insurance_products (name, slug) VALUES
  ('Auto Insurance',       'auto'),
  ('Home Insurance',       'home'),
  ('Life Insurance',       'life'),
  ('Health Insurance',     'health'),
  ('Commercial Insurance', 'commercial');


-- ============================================================
-- TABLE: relationship_managers
-- One RM record per user with role = 'rm'.
-- ============================================================

CREATE TABLE relationship_managers (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id               UUID        REFERENCES branches(id),
  employee_id             TEXT        UNIQUE,
  is_active               BOOLEAN     NOT NULL DEFAULT true,
  max_daily_appointments  INTEGER     NOT NULL DEFAULT 8 CHECK (max_daily_appointments > 0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE TRIGGER set_relationship_managers_updated_at
  BEFORE UPDATE ON relationship_managers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- TABLE: rm_specializations
-- Which products each RM can handle. Enables specialist routing.
-- ============================================================

CREATE TABLE rm_specializations (
  rm_id       UUID        NOT NULL REFERENCES relationship_managers(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES insurance_products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rm_id, product_id)
);


-- ============================================================
-- TABLE: rm_schedules
-- Weekly recurring availability per RM.
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
-- ============================================================

CREATE TABLE rm_schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rm_id           UUID        NOT NULL REFERENCES relationship_managers(id) ON DELETE CASCADE,
  day_of_week     SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      TIME        NOT NULL,
  end_time        TIME        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  effective_from  DATE        NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_schedule_hours CHECK (end_time > start_time),
  CONSTRAINT valid_effective_range CHECK (effective_until IS NULL OR effective_until >= effective_from)
);


-- ============================================================
-- TABLE: rm_leave
-- Date-specific unavailability. Overrides rm_schedules.
-- ============================================================

CREATE TABLE rm_leave (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rm_id       UUID        NOT NULL REFERENCES relationship_managers(id) ON DELETE CASCADE,
  leave_date  DATE        NOT NULL,
  leave_type  leave_type  NOT NULL DEFAULT 'full_day',
  start_time  TIME,
  end_time    TIME,
  reason      TEXT,
  approved_by UUID        REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rm_id, leave_date),
  CONSTRAINT valid_custom_leave CHECK (
    leave_type != 'custom' OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);


-- ============================================================
-- TABLE: leads
-- Core entity. Every inbound customer inquiry.
-- ============================================================

CREATE TABLE leads (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id   UUID        REFERENCES profiles(id),
  assigned_rm_id        UUID        REFERENCES relationship_managers(id),
  first_name            TEXT        NOT NULL,
  last_name             TEXT        NOT NULL,
  email                 TEXT        NOT NULL,
  phone                 TEXT        NOT NULL,
  status                lead_status NOT NULL DEFAULT 'new',
  source                lead_source NOT NULL,
  source_campaign       TEXT,
  source_medium         TEXT,
  source_content        TEXT,
  insurance_interest    TEXT[]      NOT NULL DEFAULT '{}',
  lost_reason           TEXT,
  converted_value_cents INTEGER     CHECK (converted_value_cents IS NULL OR converted_value_cents >= 0),
  metadata              JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- TABLE: appointments
-- A booking of one RM for one lead at a specific slot.
-- ============================================================

CREATE TABLE appointments (
  id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID                NOT NULL REFERENCES leads(id),
  rm_id               UUID                NOT NULL REFERENCES relationship_managers(id),
  appointment_date    DATE                NOT NULL,
  start_time          TIME                NOT NULL,
  end_time            TIME                NOT NULL,
  status              appointment_status  NOT NULL DEFAULT 'scheduled',
  confirmation_token  TEXT                UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes               TEXT,
  cancellation_reason TEXT,
  rescheduled_from_id UUID                REFERENCES appointments(id),
  created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT valid_appointment_hours CHECK (end_time > start_time),
  CONSTRAINT appointment_in_future CHECK (
    appointment_date > CURRENT_DATE
    OR (appointment_date = CURRENT_DATE AND start_time > CURRENT_TIME)
  )
);

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- TABLE: lead_assignments
-- Full history of every RM assignment for a lead.
-- ============================================================

CREATE TABLE lead_assignments (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID              NOT NULL REFERENCES leads(id),
  rm_id         UUID              NOT NULL REFERENCES relationship_managers(id),
  assigned_by   UUID              REFERENCES profiles(id),
  method        assignment_method NOT NULL DEFAULT 'manual',
  is_current    BOOLEAN           NOT NULL DEFAULT true,
  notes         TEXT,
  assigned_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ
);


-- ============================================================
-- TABLE: lead_notes
-- Notes, calls, and meetings logged against a lead.
-- ============================================================

CREATE TABLE lead_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES leads(id),
  author_id   UUID        NOT NULL REFERENCES profiles(id),
  note_type   note_type   NOT NULL DEFAULT 'general',
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER set_lead_notes_updated_at
  BEFORE UPDATE ON lead_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- TABLE: lead_stage_history
-- Immutable log of every lead status transition.
-- Auto-populated by trigger — never insert manually.
-- ============================================================

CREATE TABLE lead_stage_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES leads(id),
  from_stage  lead_status,
  to_stage    lead_status NOT NULL,
  changed_by  UUID        REFERENCES profiles(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-record every status change
CREATE OR REPLACE FUNCTION record_lead_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER lead_stage_change_trigger
  AFTER UPDATE OF status ON leads
  FOR EACH ROW EXECUTE FUNCTION record_lead_stage_change();


-- ============================================================
-- TABLE: notifications
-- Multi-channel notification queue. Supports email/SMS/WhatsApp.
-- ============================================================

CREATE TABLE notifications (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID                 NOT NULL REFERENCES profiles(id),
  lead_id         UUID                 REFERENCES leads(id),
  appointment_id  UUID                 REFERENCES appointments(id),
  type            notification_type    NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'email',
  status          notification_status  NOT NULL DEFAULT 'pending',
  template_id     TEXT,
  payload         JSONB                NOT NULL DEFAULT '{}',
  scheduled_at    TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: activity_logs
-- Immutable system-wide audit trail. Write-once.
-- ============================================================

CREATE TABLE activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES profiles(id),
  entity_type TEXT        NOT NULL,
  entity_id   UUID        NOT NULL,
  action      TEXT        NOT NULL,
  metadata    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- CAPACITY FUNCTIONS
-- Core business logic for slot availability.
-- ============================================================

-- Returns the total number of RMs available for a given slot.
CREATE OR REPLACE FUNCTION get_slot_capacity(
  p_date       DATE,
  p_start_time TIME
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_capacity    INTEGER;
BEGIN
  -- PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  SELECT COUNT(*)::INTEGER INTO v_capacity
  FROM relationship_managers rm
  WHERE rm.is_active = true
    AND rm.deleted_at IS NULL
    -- RM has a schedule covering this slot
    AND EXISTS (
      SELECT 1
      FROM rm_schedules s
      WHERE s.rm_id = rm.id
        AND s.day_of_week = v_day_of_week
        AND s.start_time <= p_start_time
        AND s.end_time > p_start_time
        AND s.is_active = true
        AND s.effective_from <= p_date
        AND (s.effective_until IS NULL OR s.effective_until >= p_date)
    )
    -- RM is not on leave for this slot
    AND NOT EXISTS (
      SELECT 1
      FROM rm_leave l
      WHERE l.rm_id = rm.id
        AND l.leave_date = p_date
        AND (
          l.leave_type = 'full_day'
          OR l.leave_type = 'morning'   -- covers 10:00–13:00
          OR l.leave_type = 'afternoon' -- covers 13:00–18:00
          OR (l.leave_type = 'custom'
              AND l.start_time <= p_start_time
              AND l.end_time > p_start_time)
        )
    );

  RETURN COALESCE(v_capacity, 0);
END;
$$;


-- Returns the number of bookable slots remaining for a given slot.
-- Returns 0 if the slot is full; never returns negative.
CREATE OR REPLACE FUNCTION get_slot_availability(
  p_date       DATE,
  p_start_time TIME
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_capacity INTEGER;
  v_booked   INTEGER;
BEGIN
  v_capacity := get_slot_capacity(p_date, p_start_time);

  SELECT COUNT(*)::INTEGER INTO v_booked
  FROM appointments
  WHERE appointment_date = p_date
    AND start_time = p_start_time
    AND status NOT IN ('cancelled', 'no_show')
    AND deleted_at IS NULL;

  RETURN GREATEST(0, v_capacity - v_booked);
END;
$$;


-- ============================================================
-- TRIGGER: enforce_appointment_capacity
-- Prevents overbooking at the database level.
-- Called before every appointment insert.
-- ============================================================

CREATE OR REPLACE FUNCTION check_appointment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_availability INTEGER;
BEGIN
  -- Skip capacity check for cancellations/reschedules
  IF TG_OP = 'UPDATE' AND NEW.status IN ('cancelled', 'no_show', 'rescheduled') THEN
    RETURN NEW;
  END IF;

  v_availability := get_slot_availability(NEW.appointment_date, NEW.start_time);

  IF v_availability <= 0 THEN
    RAISE EXCEPTION 'No capacity available for % at % on %. All RMs are fully booked.',
      NEW.start_time::TEXT, NEW.appointment_date::TEXT,
      NEW.appointment_date::TEXT
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_appointment_capacity
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION check_appointment_capacity();


-- ============================================================
-- TRIGGER: sync_lead_assignment
-- When lead.assigned_rm_id changes, records it in lead_assignments
-- and marks the previous assignment as no longer current.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_lead_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_rm_id IS DISTINCT FROM NEW.assigned_rm_id THEN
    -- Close the previous assignment
    UPDATE lead_assignments
    SET is_current = false,
        unassigned_at = NOW()
    WHERE lead_id = NEW.id
      AND is_current = true;

    -- Record the new assignment
    IF NEW.assigned_rm_id IS NOT NULL THEN
      INSERT INTO lead_assignments (lead_id, rm_id, assigned_by, method, is_current)
      VALUES (NEW.id, NEW.assigned_rm_id, auth.uid(), 'system', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER lead_assignment_sync
  AFTER UPDATE OF assigned_rm_id ON leads
  FOR EACH ROW EXECUTE FUNCTION sync_lead_assignment();


-- ============================================================
-- VIEW: v_slot_availability
-- Quick reference for the booking page.
-- Usage: SELECT * FROM v_slot_availability WHERE slot_date = '2026-07-01';
-- ============================================================

CREATE OR REPLACE VIEW v_slot_availability AS
SELECT
  d.slot_date::date                                       AS slot_date,
  t.slot_time,
  get_slot_capacity(d.slot_date::date, t.slot_time)       AS total_capacity,
  get_slot_availability(d.slot_date::date, t.slot_time)   AS available_slots
FROM
  -- Next 30 days. generate_series with a date + interval step returns
  -- timestamps, so cast back to date for the get_slot_* (DATE, TIME) functions.
  generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', INTERVAL '1 day')
    AS d(slot_date),
  -- All valid working hours
  unnest(ARRAY[
    '10:00'::TIME, '11:00'::TIME, '12:00'::TIME,
    '13:00'::TIME, '14:00'::TIME, '15:00'::TIME,
    '16:00'::TIME, '17:00'::TIME, '18:00'::TIME
  ]) AS t(slot_time);
