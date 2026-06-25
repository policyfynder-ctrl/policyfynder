-- ============================================================
-- PolicyFynder — Migration 003: Performance Indexes
-- ============================================================
-- Applies after 002_rls_policies.sql
-- ============================================================


-- ============================================================
-- leads
-- Most-queried table. Optimized for: list by status,
-- list by RM, search by email/phone, sort by date.
-- ============================================================

-- Fastest path for the RM dashboard: "show me my active leads"
CREATE INDEX idx_leads_assigned_rm
  ON leads (assigned_rm_id)
  WHERE deleted_at IS NULL;

-- Admin and reporting: filter by status
CREATE INDEX idx_leads_status
  ON leads (status)
  WHERE deleted_at IS NULL;

-- Source attribution / analytics
CREATE INDEX idx_leads_source
  ON leads (source);

-- Duplicate detection and search
CREATE INDEX idx_leads_email
  ON leads (lower(email));

CREATE INDEX idx_leads_phone
  ON leads (phone);

-- Default sort (newest first)
CREATE INDEX idx_leads_created_at
  ON leads (created_at DESC)
  WHERE deleted_at IS NULL;

-- Combined: RM + status (most common RM dashboard query)
CREATE INDEX idx_leads_rm_status
  ON leads (assigned_rm_id, status)
  WHERE deleted_at IS NULL;


-- ============================================================
-- appointments
-- Critical for capacity calculation and RM schedule views.
-- ============================================================

-- THE critical index: slot availability queries hit this constantly
CREATE INDEX idx_appointments_date_time
  ON appointments (appointment_date, start_time)
  WHERE status NOT IN ('cancelled', 'no_show')
    AND deleted_at IS NULL;

-- RM schedule view: "what appointments do I have this week?"
CREATE INDEX idx_appointments_rm_date
  ON appointments (rm_id, appointment_date)
  WHERE deleted_at IS NULL;

-- Overbooking prevention: one RM cannot have two bookings in the same slot
CREATE UNIQUE INDEX idx_appointments_rm_slot_unique
  ON appointments (rm_id, appointment_date, start_time)
  WHERE status NOT IN ('cancelled', 'no_show')
    AND deleted_at IS NULL;

-- Confirmation token lookup (used in email confirmation links)
CREATE UNIQUE INDEX idx_appointments_confirmation_token
  ON appointments (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- Lead timeline: all appointments for a given lead
CREATE INDEX idx_appointments_lead_id
  ON appointments (lead_id)
  WHERE deleted_at IS NULL;


-- ============================================================
-- rm_schedules
-- Queried on every capacity calculation.
-- ============================================================

-- Core capacity lookup: "which RMs work on Monday from 10am?"
CREATE INDEX idx_rm_schedules_rm_day
  ON rm_schedules (rm_id, day_of_week)
  WHERE is_active = true;

-- Full slot lookup including time range
CREATE INDEX idx_rm_schedules_slot
  ON rm_schedules (day_of_week, start_time, end_time)
  WHERE is_active = true;


-- ============================================================
-- rm_leave
-- Queried on every capacity calculation to exclude absent RMs.
-- ============================================================

-- "Is this RM on leave on this date?"
CREATE INDEX idx_rm_leave_rm_date
  ON rm_leave (rm_id, leave_date);

-- "Which RMs are on leave today?" (admin view)
CREATE INDEX idx_rm_leave_date
  ON rm_leave (leave_date);


-- ============================================================
-- lead_assignments
-- ============================================================

-- "Who is currently assigned to this lead?"
CREATE INDEX idx_lead_assignments_current
  ON lead_assignments (lead_id)
  WHERE is_current = true;

-- RM workload: "how many leads does this RM currently have?"
CREATE INDEX idx_lead_assignments_rm_current
  ON lead_assignments (rm_id)
  WHERE is_current = true;


-- ============================================================
-- lead_stage_history
-- ============================================================

-- Lead timeline view
CREATE INDEX idx_lead_stage_history_lead
  ON lead_stage_history (lead_id, created_at DESC);


-- ============================================================
-- lead_notes
-- ============================================================

-- Note list for a lead (newest first)
CREATE INDEX idx_lead_notes_lead
  ON lead_notes (lead_id, created_at DESC)
  WHERE deleted_at IS NULL;


-- ============================================================
-- notifications
-- ============================================================

-- Notification worker: "what needs to be sent right now?"
CREATE INDEX idx_notifications_pending_queue
  ON notifications (scheduled_at ASC)
  WHERE status = 'pending';

-- User inbox
CREATE INDEX idx_notifications_recipient
  ON notifications (recipient_id, created_at DESC);


-- ============================================================
-- activity_logs
-- ============================================================

-- "Show me all activity on lead X"
CREATE INDEX idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id, created_at DESC);

-- "Show me everything actor Y did"
CREATE INDEX idx_activity_logs_actor
  ON activity_logs (actor_id, created_at DESC);
