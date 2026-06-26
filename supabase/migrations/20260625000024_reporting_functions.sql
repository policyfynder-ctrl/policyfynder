-- Migration 24: Reports & Analytics — scoped aggregate functions
-- ============================================================
-- Milestone 10. Adds SECURITY DEFINER reporting functions for /dashboard/reports.
-- Each function bypasses RLS (so it can aggregate) but RE-APPLIES the caller's data
-- scope internally via get_accessible_branch_ids() / get_accessible_rm_ids() /
-- get_accessible_team_ids() — identical to the entity RLS. A report therefore never
-- returns more than the caller could already see row-by-row:
--   * plain RM  → own assigned data (get_accessible_rm_ids() = {self})
--   * manager   → their branch / team
--   * admin     → all (get_accessible_branch_ids() returns every branch)
--   * customer  → nothing (all helpers return empty)
-- No RLS policy changes, no new permissions (reports.view_* already seeded; used
-- only for page/section gating). Money fields are reference-only (premium_cents).
-- ============================================================

-- A few indexes the reports query that weren't needed before (all partial on live rows).
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policies_created_at  ON policies(created_at)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_completed      ON tasks(completed_at)   WHERE deleted_at IS NULL;

-- ============================================================
-- 1. report_overview() — KPI tiles
-- ============================================================
CREATE OR REPLACE FUNCTION report_overview()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH
  l AS (SELECT count(*) total, count(*) FILTER (WHERE status='converted') conv,
               coalesce(sum(converted_value_cents) FILTER (WHERE status='converted'),0) won
        FROM leads WHERE deleted_at IS NULL
          AND (branch_id = ANY(get_accessible_branch_ids()) OR assigned_rm_id = ANY(get_accessible_rm_ids()))),
  a AS (SELECT count(*) total, count(*) FILTER (WHERE status='completed') done,
               count(*) FILTER (WHERE status='no_show') ns
        FROM appointments WHERE deleted_at IS NULL
          AND (branch_id = ANY(get_accessible_branch_ids()) OR rm_id = ANY(get_accessible_rm_ids()))),
  p AS (SELECT count(*) FILTER (WHERE status='active') active,
               coalesce(sum(premium_cents) FILTER (WHERE status='active'),0) premium,
               count(*) FILTER (WHERE status='active' AND renewal_completed_at IS NULL
                     AND renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30) due30,
               count(*) FILTER (WHERE renewal_completed_at BETWEEN date_trunc('month',CURRENT_DATE)::date AND CURRENT_DATE) compl
        FROM policies WHERE deleted_at IS NULL
          AND (branch_id = ANY(get_accessible_branch_ids()) OR assigned_rm_id = ANY(get_accessible_rm_ids())))
  SELECT jsonb_build_object(
    'leads_total',l.total,'leads_converted',l.conv,
    'conversion_pct',CASE WHEN l.total>0 THEN round(100.0*l.conv/l.total,1) ELSE 0 END,
    'won_value_cents',l.won,
    'appts_total',a.total,'appts_completed',a.done,
    'no_show_pct',CASE WHEN a.total>0 THEN round(100.0*a.ns/a.total,1) ELSE 0 END,
    'active_policies',p.active,'premium_under_mgmt_cents',p.premium,
    'renewals_due_30',p.due30,'renewals_completed_mtd',p.compl)
  FROM l,a,p;
$$;

-- ============================================================
-- 2. report_lead_funnel(from, to) — lead counts by status
-- ============================================================
CREATE OR REPLACE FUNCTION report_lead_funnel(p_from DATE, p_to DATE)
RETURNS TABLE (status lead_status, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT l.status, count(*)
  FROM leads l
  WHERE l.deleted_at IS NULL
    AND l.created_at::date BETWEEN p_from AND p_to
    AND (l.branch_id = ANY(get_accessible_branch_ids()) OR l.assigned_rm_id = ANY(get_accessible_rm_ids()))
  GROUP BY l.status
  ORDER BY l.status;
$$;

-- ============================================================
-- 3. report_lead_sources(from, to) — total + converted by source
-- ============================================================
CREATE OR REPLACE FUNCTION report_lead_sources(p_from DATE, p_to DATE)
RETURNS TABLE (source TEXT, total BIGINT, converted BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT l.source::text, count(*), count(*) FILTER (WHERE l.status='converted')
  FROM leads l
  WHERE l.deleted_at IS NULL
    AND l.created_at::date BETWEEN p_from AND p_to
    AND (l.branch_id = ANY(get_accessible_branch_ids()) OR l.assigned_rm_id = ANY(get_accessible_rm_ids()))
  GROUP BY l.source
  ORDER BY count(*) DESC;
$$;

-- ============================================================
-- 4. report_leads_monthly(months) — monthly new + converted, last N months
-- ============================================================
CREATE OR REPLACE FUNCTION report_leads_monthly(p_months INT DEFAULT 6)
RETURNS TABLE (month DATE, total BIGINT, converted BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT date_trunc('month', l.created_at)::date AS month,
         count(*), count(*) FILTER (WHERE l.status='converted')
  FROM leads l
  WHERE l.deleted_at IS NULL
    AND l.created_at >= date_trunc('month', CURRENT_DATE) - make_interval(months => GREATEST(p_months,1) - 1)
    AND (l.branch_id = ANY(get_accessible_branch_ids()) OR l.assigned_rm_id = ANY(get_accessible_rm_ids()))
  GROUP BY 1
  ORDER BY 1;
$$;

-- ============================================================
-- 5. report_appointment_stats(from, to) — counts by status
-- ============================================================
CREATE OR REPLACE FUNCTION report_appointment_stats(p_from DATE, p_to DATE)
RETURNS TABLE (status appointment_status, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT a.status, count(*)
  FROM appointments a
  WHERE a.deleted_at IS NULL
    AND a.appointment_date BETWEEN p_from AND p_to
    AND (a.branch_id = ANY(get_accessible_branch_ids()) OR a.rm_id = ANY(get_accessible_rm_ids()))
  GROUP BY a.status
  ORDER BY a.status;
$$;

-- ============================================================
-- 6. report_policy_status() — current policy book by status
-- ============================================================
CREATE OR REPLACE FUNCTION report_policy_status()
RETURNS TABLE (status policy_status, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT po.status, count(*)
  FROM policies po
  WHERE po.deleted_at IS NULL
    AND (po.branch_id = ANY(get_accessible_branch_ids()) OR po.assigned_rm_id = ANY(get_accessible_rm_ids()))
  GROUP BY po.status
  ORDER BY po.status;
$$;

-- ============================================================
-- 7. report_policy_by_insurer() — count + reference premium by insurer
-- ============================================================
CREATE OR REPLACE FUNCTION report_policy_by_insurer()
RETURNS TABLE (name TEXT, count BIGINT, premium_cents BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT i.name, count(*), coalesce(sum(po.premium_cents),0)
  FROM policies po JOIN insurers i ON i.id = po.insurer_id
  WHERE po.deleted_at IS NULL
    AND (po.branch_id = ANY(get_accessible_branch_ids()) OR po.assigned_rm_id = ANY(get_accessible_rm_ids()))
  GROUP BY i.name
  ORDER BY count(*) DESC;
$$;

-- ============================================================
-- 8. report_policy_by_product() — count + reference premium by product
-- ============================================================
CREATE OR REPLACE FUNCTION report_policy_by_product()
RETURNS TABLE (name TEXT, count BIGINT, premium_cents BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT pr.name, count(*), coalesce(sum(po.premium_cents),0)
  FROM policies po JOIN insurance_products pr ON pr.id = po.product_id
  WHERE po.deleted_at IS NULL
    AND (po.branch_id = ANY(get_accessible_branch_ids()) OR po.assigned_rm_id = ANY(get_accessible_rm_ids()))
  GROUP BY pr.name
  ORDER BY count(*) DESC;
$$;

-- ============================================================
-- 9. report_renewals() — renewal pipeline KPIs
-- ============================================================
CREATE OR REPLACE FUNCTION report_renewals()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH p AS (
    SELECT * FROM policies
    WHERE deleted_at IS NULL
      AND (branch_id = ANY(get_accessible_branch_ids()) OR assigned_rm_id = ANY(get_accessible_rm_ids()))
  ),
  m AS (
    SELECT
      count(*) FILTER (WHERE status='active' AND renewal_completed_at IS NULL
                       AND renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30)  due_30,
      count(*) FILTER (WHERE status='active' AND renewal_completed_at IS NULL
                       AND renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE+60)  due_60,
      count(*) FILTER (WHERE status='active' AND renewal_completed_at IS NULL
                       AND renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE+90)  due_90,
      count(*) FILTER (WHERE status='active' AND renewal_completed_at IS NULL
                       AND renewal_date < CURRENT_DATE)                            overdue,
      count(*) FILTER (WHERE renewal_completed_at BETWEEN date_trunc('month',CURRENT_DATE)::date AND CURRENT_DATE) completed_mtd,
      count(*) FILTER (WHERE renewal_date BETWEEN date_trunc('month',CURRENT_DATE)::date
                              AND (date_trunc('month',CURRENT_DATE)+interval '1 month -1 day')::date) due_month,
      count(*) FILTER (WHERE renewal_date BETWEEN date_trunc('month',CURRENT_DATE)::date
                              AND (date_trunc('month',CURRENT_DATE)+interval '1 month -1 day')::date
                       AND renewal_completed_at IS NOT NULL) completed_due_month
    FROM p
  )
  SELECT jsonb_build_object(
    'due_30',due_30,'due_60',due_60,'due_90',due_90,'overdue',overdue,
    'completed_mtd',completed_mtd,
    'renewal_rate', CASE WHEN due_month>0 THEN round(100.0*completed_due_month/due_month,1) ELSE 0 END)
  FROM m;
$$;

-- ============================================================
-- 10. report_rm_performance() — per-RM scorecard (scoped to accessible RMs)
-- ============================================================
CREATE OR REPLACE FUNCTION report_rm_performance()
RETURNS TABLE (rm_id uuid, rm_name text, leads_total bigint, leads_converted bigint,
               appts_completed bigint, active_policies bigint, renewals_completed_mtd bigint,
               tasks_open bigint, tasks_overdue bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rm.id, pr.full_name,
    (SELECT count(*) FROM leads l WHERE l.assigned_rm_id=rm.id AND l.deleted_at IS NULL),
    (SELECT count(*) FROM leads l WHERE l.assigned_rm_id=rm.id AND l.status='converted' AND l.deleted_at IS NULL),
    (SELECT count(*) FROM appointments a WHERE a.rm_id=rm.id AND a.status='completed' AND a.deleted_at IS NULL),
    (SELECT count(*) FROM policies po WHERE po.assigned_rm_id=rm.id AND po.status='active' AND po.deleted_at IS NULL),
    (SELECT count(*) FROM policies po WHERE po.assigned_rm_id=rm.id AND po.deleted_at IS NULL
        AND po.renewal_completed_at BETWEEN date_trunc('month',CURRENT_DATE)::date AND CURRENT_DATE),
    (SELECT count(*) FROM tasks t WHERE t.assigned_rm_id=rm.id AND t.completed_at IS NULL AND t.deleted_at IS NULL),
    (SELECT count(*) FROM tasks t WHERE t.assigned_rm_id=rm.id AND t.completed_at IS NULL AND t.deleted_at IS NULL AND t.due_at < now())
  FROM relationship_managers rm JOIN profiles pr ON pr.id=rm.profile_id
  WHERE rm.id = ANY(get_accessible_rm_ids()) AND rm.deleted_at IS NULL
  ORDER BY pr.full_name;
$$;

-- ============================================================
-- 11. report_team_performance() — per-team rollup over current members
-- ============================================================
CREATE OR REPLACE FUNCTION report_team_performance()
RETURNS TABLE (team_id uuid, team_name text, branch_name text, member_count bigint,
               leads_total bigint, leads_converted bigint, appts_completed bigint,
               active_policies bigint, renewals_completed_mtd bigint, tasks_open bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH scoped_teams AS (
    SELECT t.id, t.name, t.branch_id FROM teams t
    WHERE t.deleted_at IS NULL
      AND (t.branch_id = ANY(get_accessible_branch_ids()) OR t.id = ANY(get_accessible_team_ids()))
  ),
  members AS (
    SELECT tm.team_id, tm.rm_id FROM team_members tm
    WHERE tm.is_current = true AND tm.team_id IN (SELECT id FROM scoped_teams)
  )
  SELECT st.id, st.name, b.name,
    (SELECT count(*) FROM members m WHERE m.team_id=st.id),
    (SELECT count(*) FROM leads l WHERE l.assigned_rm_id IN (SELECT rm_id FROM members m WHERE m.team_id=st.id) AND l.deleted_at IS NULL),
    (SELECT count(*) FROM leads l WHERE l.assigned_rm_id IN (SELECT rm_id FROM members m WHERE m.team_id=st.id) AND l.status='converted' AND l.deleted_at IS NULL),
    (SELECT count(*) FROM appointments a WHERE a.rm_id IN (SELECT rm_id FROM members m WHERE m.team_id=st.id) AND a.status='completed' AND a.deleted_at IS NULL),
    (SELECT count(*) FROM policies po WHERE po.assigned_rm_id IN (SELECT rm_id FROM members m WHERE m.team_id=st.id) AND po.status='active' AND po.deleted_at IS NULL),
    (SELECT count(*) FROM policies po WHERE po.assigned_rm_id IN (SELECT rm_id FROM members m WHERE m.team_id=st.id) AND po.deleted_at IS NULL AND po.renewal_completed_at BETWEEN date_trunc('month',CURRENT_DATE)::date AND CURRENT_DATE),
    (SELECT count(*) FROM tasks tk WHERE tk.assigned_rm_id IN (SELECT rm_id FROM members m WHERE m.team_id=st.id) AND tk.completed_at IS NULL AND tk.deleted_at IS NULL)
  FROM scoped_teams st JOIN branches b ON b.id=st.branch_id
  ORDER BY b.name, st.name;
$$;

-- ============================================================
-- 12. report_branch_performance() — per-branch rollup
-- ============================================================
CREATE OR REPLACE FUNCTION report_branch_performance()
RETURNS TABLE (branch_id uuid, branch_name text, rm_count bigint,
               leads_total bigint, leads_converted bigint, appts_completed bigint,
               active_policies bigint, renewals_completed_mtd bigint, premium_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT b.id, b.name,
    (SELECT count(*) FROM relationship_managers rm WHERE rm.branch_id=b.id AND rm.deleted_at IS NULL),
    (SELECT count(*) FROM leads l WHERE l.branch_id=b.id AND l.deleted_at IS NULL),
    (SELECT count(*) FROM leads l WHERE l.branch_id=b.id AND l.status='converted' AND l.deleted_at IS NULL),
    (SELECT count(*) FROM appointments a WHERE a.branch_id=b.id AND a.status='completed' AND a.deleted_at IS NULL),
    (SELECT count(*) FROM policies po WHERE po.branch_id=b.id AND po.status='active' AND po.deleted_at IS NULL),
    (SELECT count(*) FROM policies po WHERE po.branch_id=b.id AND po.deleted_at IS NULL
        AND po.renewal_completed_at BETWEEN date_trunc('month',CURRENT_DATE)::date AND CURRENT_DATE),
    (SELECT coalesce(sum(po.premium_cents),0) FROM policies po WHERE po.branch_id=b.id AND po.status='active' AND po.deleted_at IS NULL)
  FROM branches b
  WHERE b.id = ANY(get_accessible_branch_ids())
  ORDER BY b.name;
$$;

-- ============================================================
-- GRANTS (default privileges from migration 013 already cover this; explicit for clarity)
-- ============================================================
GRANT EXECUTE ON FUNCTION
  report_overview(), report_lead_funnel(DATE,DATE), report_lead_sources(DATE,DATE),
  report_leads_monthly(INT), report_appointment_stats(DATE,DATE), report_policy_status(),
  report_policy_by_insurer(), report_policy_by_product(), report_renewals(),
  report_rm_performance(), report_team_performance(), report_branch_performance()
TO authenticated;
