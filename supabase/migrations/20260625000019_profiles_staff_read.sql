-- Migration 19 (revised): least-privilege staff name directory
-- ============================================================
-- profiles is readable only by the owner (user_own_profile_select) and admins
-- (admin_all_profiles). Managers/team leaders need the NAMES of the RMs they
-- manage — for the RM/team management UI and the RM-name columns in leads and
-- appointments — but they must NOT gain access to RM email, phone, avatar, or
-- any other profile column, and customer profiles must stay completely private.
--
-- The first draft of this migration added a profiles SELECT policy. But RLS is
-- row-level, not column-level: a passing SELECT exposes the WHOLE profile row
-- (email/phone/avatar included). That over-shares. Instead we expose a single,
-- minimal VIEW that surfaces only full_name, and only for RMs the caller can
-- already see.
--
-- v_staff_directory:
--   * SECURITY DEFINER view (security_invoker = false): it reads full_name past
--     the self+admin profiles RLS, but only the columns listed below are ever
--     returned — no email/phone/avatar can leak.
--   * Scoped per-caller by get_accessible_rm_ids() (SECURITY DEFINER STABLE,
--     keyed off auth.uid()), so NAME visibility exactly matches DATA visibility.
--     This also fixes the team-leader gap: they see their team's RMs (their
--     accessible RM set) rather than an empty branch list.
--   * Self-name always resolves (rm.profile_id = auth.uid()), so an RM still sees
--     their OWN name on their assigned leads/appointments even without rms.view.
--     Seeing OTHER RMs' names additionally requires has_permission('rms','view').
--   * Customers are never included — the view only joins relationship_managers,
--     and get_accessible_rm_ids() returns nothing for a customer regardless.
-- profiles RLS itself is left untouched (still self + admin only).
-- ============================================================

-- Drop the over-broad first-draft policy if it was applied.
DROP POLICY IF EXISTS "profiles_select_staff_scoped" ON profiles;

CREATE OR REPLACE VIEW v_staff_directory
WITH (security_invoker = false)
AS
SELECT
  rm.id        AS rm_id,
  p.full_name  AS full_name,
  rm.branch_id AS branch_id,
  rm.team_id   AS team_id,
  rm.is_active AS is_active
FROM relationship_managers rm
JOIN profiles p ON p.id = rm.profile_id
WHERE rm.deleted_at IS NULL
  AND rm.id = ANY (get_accessible_rm_ids())
  AND (has_permission('rms', 'view') OR rm.profile_id = auth.uid());

GRANT SELECT ON v_staff_directory TO authenticated;

COMMENT ON VIEW v_staff_directory IS
  'Minimal staff name lookup: rm_id + full_name for RMs the caller can access '
  '(scoped by get_accessible_rm_ids, gated by rms.view). Exposes no email/phone/'
  'avatar; customer profiles are never included. Used to resolve RM display names '
  'past the self+admin profiles RLS.';
