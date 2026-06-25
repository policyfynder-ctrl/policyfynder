-- ============================================================
-- PolicyFynder — Dev Seed Data
-- ============================================================
-- Run with: supabase db reset
-- This file runs after all migrations.
-- ============================================================
-- NOTE: Auth users must be created via Supabase dashboard or
-- the auth API. This seed only populates non-auth tables.
-- The profiles table is auto-populated by trigger on user creation.
-- ============================================================

-- Branches (Head Office was inserted in migration 001, skip if exists)
-- South Office is a second branch for multi-branch local testing
INSERT INTO branches (name, code, address, timezone)
VALUES ('South Office', 'south-office', '456 MG Road, Bangalore', 'Asia/Kolkata')
ON CONFLICT (code) DO NOTHING;

-- Insurance products were seeded in migration 001.
-- Nothing more needed here for products.

-- ============================================================
-- To fully test the app locally:
--
-- 1. Create users via Supabase Auth dashboard:
--    - admin@test.com   → set role to 'admin' in profiles
--    - rm1@test.com     → set role to 'rm', create relationship_managers row
--    - rm2@test.com     → set role to 'rm', create relationship_managers row
--
-- 2. Add RM schedules (Mon–Fri, 10am–6pm):
--    INSERT INTO rm_schedules (rm_id, day_of_week, start_time, end_time)
--    SELECT id, generate_series(1, 5), '10:00', '18:00'
--    FROM relationship_managers LIMIT 2;
--
-- 3. Insert sample leads:
--    INSERT INTO leads (first_name, last_name, email, phone, source, status)
--    VALUES ('Priya', 'Sharma', 'priya@example.com', '9876543210', 'instagram', 'new'),
--           ('Arjun', 'Mehta', 'arjun@example.com', '9123456789', 'google', 'scheduled');
-- ============================================================
