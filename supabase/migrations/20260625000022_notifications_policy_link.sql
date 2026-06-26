-- Migration 22: notifications — policy link + renewal types
-- ============================================================
-- Milestone 9 (Renewals & Reminders). Enum values cannot be ADDed and USED in the
-- same transaction, so the new notification_type values live in their own
-- migration (this file); migration 023 references them only inside a function
-- body (not executed at migration time) and is therefore safe.
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'policy_renewal_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'policy_renewal_overdue';

-- Link notifications to a policy (renewal reminders target a policy).
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES policies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_policy ON notifications(policy_id);
