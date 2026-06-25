-- Migration 13: API role grants
-- ============================================================
-- Postgres requires BOTH a table-level GRANT *and* a passing RLS policy before a
-- role can touch data. Supabase Cloud applies these grants implicitly (via default
-- privileges on the postgres role), but a vanilla/local Postgres does not — so the
-- anonymous booking page reads fail with "permission denied for table branches".
--
-- Grant the standard API roles explicitly so the schema is self-contained and behaves
-- identically on local, cloud, and any fresh deploy. RLS — already enabled on every
-- table — remains the real gate: a grant without a permissive policy yields zero rows,
-- so this does NOT widen what anon can actually see or do.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Tables + views. RLS decides which rows/operations are actually allowed per role.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  TO anon, authenticated, service_role;

-- Make future objects created by postgres inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
