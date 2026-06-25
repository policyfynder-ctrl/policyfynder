-- Migration 8: Notification Templates & Delivery Tracking
-- Adds a template registry for WhatsApp/email/SMS templates.
-- WhatsApp Business API requires pre-approved templates — this table stores
-- the external template_id mapping, required variables, and approval status.
-- Adds retry logic and delivery tracking to the notifications table.

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                 TEXT NOT NULL,
  channel              notification_channel NOT NULL,
  language             TEXT NOT NULL DEFAULT 'en',
  -- external_template_id: the ID assigned by the channel provider (e.g. WhatsApp Business template name)
  external_template_id TEXT,
  subject              TEXT, -- email subject line
  body_preview         TEXT NOT NULL, -- human-readable preview (not sent; for admin reference)
  required_variables   TEXT[] NOT NULL DEFAULT '{}', -- variables the payload must include before sending
  is_active            BOOLEAN NOT NULL DEFAULT true,
  approved_at          TIMESTAMPTZ, -- when WhatsApp template was approved
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, channel, language)
);

CREATE TRIGGER set_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ALTER notifications: retry logic + delivery tracking
-- ============================================================

ALTER TABLE notifications
  -- Link to the template used (nullable; some notifications are ad-hoc)
  ADD COLUMN IF NOT EXISTS template_ref_id     UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  -- Retry tracking: the Edge Function worker checks retry_count < max_retries before requeueing
  ADD COLUMN IF NOT EXISTS retry_count         SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries         SMALLINT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at       TIMESTAMPTZ,
  -- Delivery receipt: the message ID returned by the channel provider (used for status webhooks)
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_templates_select_authenticated" ON notification_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "notification_templates_manage_admin" ON notification_templates
  FOR ALL TO authenticated USING (is_admin());
