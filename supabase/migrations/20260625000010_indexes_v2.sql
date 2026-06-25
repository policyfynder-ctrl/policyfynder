-- Migration 10: Indexes for New Tables and Columns

-- ── roles ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ── user_roles ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_profile_id ON user_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id    ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope
  ON user_roles(scope_type, scope_id) WHERE scope_id IS NOT NULL;
-- Lookup for role assignments by profile and role.
-- NOTE: expires_at IS NULL OR expires_at > now() cannot be used as a partial index
-- predicate because now() is STABLE, not IMMUTABLE — PostgreSQL forbids non-immutable
-- functions in index predicates. The expires_at check is enforced at query runtime
-- in has_permission(), get_accessible_branch_ids(), and get_accessible_rm_ids().
CREATE INDEX IF NOT EXISTS idx_user_roles_active
  ON user_roles(profile_id, role_id);

-- ── teams ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_teams_branch_id ON teams(branch_id);
CREATE INDEX IF NOT EXISTS idx_teams_active
  ON teams(branch_id, is_active) WHERE is_active = true AND deleted_at IS NULL;

-- ── team_members ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_rm_id   ON team_members(rm_id);

-- ── relationship_managers: new columns ───────────────────────
CREATE INDEX IF NOT EXISTS idx_rms_team_id ON relationship_managers(team_id);

-- ── working_hours_config ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_working_hours_branch_day
  ON working_hours_config(branch_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_working_hours_active
  ON working_hours_config(is_active, effective_from) WHERE is_active = true;

-- ── branch_holidays ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_branch_holidays_date     ON branch_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_branch_holidays_branch   ON branch_holidays(branch_id, holiday_date);

-- ── lead_sources ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lead_sources_active ON lead_sources(is_active) WHERE is_active = true;

-- ── leads: new columns ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_source_id  ON leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id  ON leads(branch_id);
-- Follow-up queue: RMs scan for overdue follow-ups
CREATE INDEX IF NOT EXISTS idx_leads_follow_up
  ON leads(follow_up_at) WHERE follow_up_at IS NOT NULL AND deleted_at IS NULL;
-- SLA queue: admin/manager escalation view
CREATE INDEX IF NOT EXISTS idx_leads_sla
  ON leads(sla_deadline_at) WHERE sla_deadline_at IS NOT NULL AND deleted_at IS NULL;
-- Priority filter: used in lead list ordering
CREATE INDEX IF NOT EXISTS idx_leads_priority
  ON leads(priority, created_at) WHERE deleted_at IS NULL;

-- ── lead_follow_ups ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id    ON lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_rm_id      ON lead_follow_ups(rm_id);
-- Upcoming follow-ups queue (incomplete items sorted by scheduled_at)
CREATE INDEX IF NOT EXISTS idx_follow_ups_pending
  ON lead_follow_ups(rm_id, scheduled_at) WHERE completed_at IS NULL;

-- ── appointments: new branch_id ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON appointments(branch_id);

-- ── notification_templates ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel
  ON notification_templates(channel) WHERE is_active = true;

-- ── notifications: retry queue ───────────────────────────────
-- Edge Function worker polls this index to find failed notifications due for retry
CREATE INDEX IF NOT EXISTS idx_notifications_retry_queue
  ON notifications(next_retry_at)
  WHERE status = 'failed'
    AND next_retry_at IS NOT NULL;
