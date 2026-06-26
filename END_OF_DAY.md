# END OF DAY — 2026-06-25

Handoff snapshot for PolicyFynder. Nothing was changed to produce this file.

---

## 1. Current branch
`milestone-7` (stacked on `milestone-6` → `milestone-5` → `main`).

## 2. Current git status
- **Last commit:** `badd13d` — "Milestone 6 - Appointment Management".
- **`origin/milestone-7`** is at that same commit — **Milestone 7 is NOT committed or pushed yet.**
- **Uncommitted working tree** (all Milestone 7 work):
  - Modified: `MEMORY.md`, `architecture/database-schema.md`
  - Untracked: `src/app/(dashboard)/rms/`, `src/app/(dashboard)/teams/`, `src/app/api/admin/`,
    `src/components/features/rms/`, `src/components/features/teams/`,
    `src/lib/rms.ts`, `src/services/{rms,teams,branches}.ts`,
    `supabase/migrations/20260625000018_rm_team_management_rls.sql`,
    `supabase/migrations/20260625000019_profiles_staff_read.sql`
- typecheck ✓ · lint ✓ (as of last run).

## 3. Local migration version
**019** applied locally (001–019 present).
⚠️ Caveat: the applied `019` is the **first/broad draft** (a `profiles` SELECT policy that exposes full RM rows incl. email/phone). It is slated to be **replaced** by the least-privilege `v_staff_directory` view design (reviewed, **not yet applied**).

## 4. Cloud migration version
**017** (verified: `get_accessible_team_ids` from migration 018 returns 404 on cloud).
Migrations **018 and 019 are LOCAL ONLY** — not pushed to cloud.

## 5. What was completed today
- **Milestone 5 — Lead Management**: shipped, verified local + cloud, committed (`4cfbf77`), pushed; migration 015 on cloud.
- **Milestone 6 — Appointment Management**: shipped, verified local + cloud, committed (`badd13d`), pushed; migrations 016 + 017 on cloud. (Found/fixed the capacity-trigger status-update bug, 017.)
- **GitHub**: repo connected (`policyfynder-ctrl/policyfynder`); `main`, `milestone-5/6/7` branches pushed; `gh` CLI authenticated.
- **Milestone 7 — RM & Team Management (BUILT, local only)**:
  - Migration 018 (hierarchy-aware RM/team write RLS + `get_accessible_team_ids()`) — applied local, verified.
  - Migration 019 (staff profile read) — applied local in **broad draft form**, then **redesigned** to a least-privilege `v_staff_directory` view (rm_id + full_name only). Revised SQL reviewed; **awaiting approval to apply**.
  - Services (`rms`, `teams`, `branches`), `/api/admin/rms` (service-role create/promote), pages (`/dashboard/rms`, `/dashboard/teams` + detail), components, dashboard wiring.
  - Verified locally: branch manager can manage RMs/teams/schedules/members; plain RM denied; routes guard; API 401 unauth.

## 6. What remains for Milestone 7
1. **Approve & apply the revised migration 019** (drop the broad `profiles_select_staff_scoped` policy; create `v_staff_directory` view exposing only `rm_id, full_name`, scoped by `get_accessible_rm_ids()`).
2. **Rewire services** to read RM names from `v_staff_directory` instead of `profile:profiles(full_name)`:
   - `src/services/rms.ts`, `src/services/teams.ts` (RM/team name display)
   - `src/services/leads.ts`, `src/services/appointments.ts` (assigned-RM name display)
3. **Re-verify locally**: branch manager sees RM names but NOT emails; team leader now sees their team's names; customer unaffected; typecheck/lint.
4. **Push 018 + revised-019 to cloud** (needs explicit approval) and re-verify on cloud.
5. **Commit + push** `milestone-7` (needs approval).
6. (Optional) open PRs for milestone-5/6/7 in order.

## 7. Exact next command/prompt to continue tomorrow
Paste this to resume:

> "Approve the revised Migration 019 (staff-directory view). Apply it to local, rewire `rms`, `teams`, `leads`, and `appointments` services to resolve RM names via `v_staff_directory`, and re-verify locally (manager sees names not emails; team leader sees their team; customer unaffected; typecheck + lint). Do NOT push to cloud or commit yet — stop and show me results."

Then, after review:

> "Push migrations 018 + 019 to cloud, verify, then commit and push milestone-7."

## 8. Open risks / decisions
- **Local has the over-broad 019 applied.** Until the revised view replaces it, the local DB exposes RM `profiles` rows (incl. email/phone) to managers. Cloud is unaffected (019 never pushed). Resolve by applying the revised migration.
- **Sales-manager scope (open decision):** the staff directory + existing data RLS give sales managers **branch-wide** RM visibility (they're seeded `scope_type='branch'`). Recommended to keep name-scope = data-scope. Narrowing sales managers to team-only is a separate, larger change to their role scope (affects lead/appointment access too).
- **`v_staff_directory` uses `security_invoker = false`** by design (to read `full_name` past `profiles` RLS while exposing only that column). Supabase's linter will flag it; this is intentional and safe given the fixed column list + in-WHERE scoping.
- **Branch stacking:** `milestone-7` includes the unmerged `milestone-5` and `milestone-6` commits. Merge PRs in order (5 → 6 → 7) to avoid surprises.
- **Cloud test data left from verification:** RM `cloud_rm@policyfynder.test` (+ schedule), lead `cloudtest@example.com` (status `contacted`), appointment `a5f9fec8…` (status `completed`). Keep the RM; the test lead/appointment can be deleted on request.
- **DB password / service_role key** were pasted in chat earlier — rotating them in the Supabase dashboard remains a good hygiene step.

---
_Generated 2026-06-25. No code or schema changed by this handoff._
