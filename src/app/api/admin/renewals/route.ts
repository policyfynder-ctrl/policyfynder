import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Generate renewal reminders. generate_renewal_reminders() is SECURITY DEFINER and
// granted to service_role only, so it runs here via the admin client — but the
// caller is authorized first (session + renewals.manage). The function is
// idempotent (no duplicate open renewal tasks / pending reminders), so this is safe
// to call repeatedly. Queue-only: it creates task + in-app notification rows; no
// external message is sent. The service key never reaches the browser.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { data: allowed } = await supabase.rpc('has_permission', {
    p_resource: 'renewals',
    p_action: 'manage',
  })
  if (!allowed) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  let daysAhead = 30
  try {
    const body = await request.json()
    const n = Number(body?.daysAhead)
    if (Number.isFinite(n) && n > 0 && n <= 365) daysAhead = Math.floor(n)
  } catch {
    // default window
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('generate_renewal_reminders', { p_days_ahead: daysAhead })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, tasksCreated: data ?? 0, daysAhead })
}
