-- Migration 27: Communication Dispatch (claim layer)
-- ============================================================
-- Milestone 13. The M12 queue already carries every column a worker needs
-- (status, channel, retry_count/max_retries/next_retry_at, provider_message_id,
-- template_ref_id, payload). This migration adds ONLY the safe-concurrency layer
-- so a Vercel-Cron-driven dispatcher can run repeatedly / overlap without ever
-- double-sending a message:
--   * notifications.claimed_at — a worker stamps this when it takes a row
--   * claim_due_notifications(p_limit) — atomically selects + stamps due rows with
--     FOR UPDATE SKIP LOCKED (service_role only), including stale-claim recovery
-- No enum changes, no destructive changes. Dry-run dispatch + adapters live in the
-- app layer; nothing here sends anything.
-- ============================================================

-- A row is "in flight" once a worker stamps claimed_at. The dispatcher clears it
-- back to NULL on a retryable failure so the row can be re-claimed after its
-- backoff; on success the row becomes status='sent' and is never claimed again.
ALTER TABLE notifications ADD COLUMN claimed_at TIMESTAMPTZ;

-- Helps the failed/retryable branch of the claim query.
CREATE INDEX idx_notifications_retry ON notifications(next_retry_at)
  WHERE status = 'failed';

-- ===== Atomic claim =====
-- Returns (and stamps) up to p_limit messages that are due to be dispatched:
--   * fresh pending rows whose scheduled_at has passed, OR
--   * failed rows that are still under max_retries and whose next_retry_at has passed.
-- in_app messages never need external dispatch, so they are excluded.
-- FOR UPDATE SKIP LOCKED makes concurrent/overlapping worker runs safe: each row is
-- handed to exactly one caller. A claim older than the stale window is treated as
-- abandoned (worker crashed mid-send) and becomes claimable again.
CREATE OR REPLACE FUNCTION claim_due_notifications(p_limit INT DEFAULT 25)
RETURNS SETOF notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale CONSTANT INTERVAL := INTERVAL '15 minutes';
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT n.id
    FROM notifications n
    WHERE n.channel <> 'in_app'
      AND n.scheduled_at <= now()
      AND (n.claimed_at IS NULL OR n.claimed_at < now() - v_stale)   -- free or stale
      AND (
        n.status = 'pending'
        OR (
          n.status = 'failed'
          AND n.retry_count < n.max_retries
          AND (n.next_retry_at IS NULL OR n.next_retry_at <= now())
        )
      )
    ORDER BY n.scheduled_at
    LIMIT GREATEST(p_limit, 0)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE notifications n
  SET claimed_at = now()
  FROM due
  WHERE n.id = due.id
  RETURNING n.*;
END;
$$;

-- Service-role only: the dispatcher runs with the service key (it sends on behalf of
-- the system and must bypass RLS). No reason for anon/authenticated to claim.
REVOKE ALL ON FUNCTION claim_due_notifications(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_due_notifications(INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_due_notifications(INT) TO service_role;
