import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

// Admin client bypasses all RLS policies.
// Import ONLY in src/app/api/ route handlers and server services — never in
// components or pages. Env access is validated (env.ts) so a missing key fails
// fast with a clear message rather than a cryptic Supabase error.
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
