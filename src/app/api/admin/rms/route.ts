import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Create or promote a relationship manager. This is the ONE place the service-role
// client is used for RM onboarding, because it must create auth users and write the
// admin-gated profiles.role + user_roles. It is server-only and authorizes the
// caller first (session + rms.manage_branch + branch in scope) — the client never
// sees the service key.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { data: allowed } = await supabase.rpc('has_permission', {
    p_resource: 'rms',
    p_action: 'manage_branch',
  })
  if (!allowed) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const { data: branchIds } = await supabase.rpc('get_accessible_branch_ids')
  const accessible: string[] = branchIds ?? []

  let body: {
    mode?: string
    email?: string
    password?: string
    fullName?: string
    branchId?: string
    maxDaily?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  const branchId = String(body.branchId ?? '')
  const mode = body.mode === 'create' ? 'create' : 'promote'
  if (!email) return NextResponse.json({ ok: false, error: 'Email is required.' }, { status: 400 })
  if (!accessible.includes(branchId)) {
    return NextResponse.json({ ok: false, error: 'Branch is not in your scope.' }, { status: 403 })
  }

  const admin = createAdminClient()
  let profileId: string

  if (mode === 'create') {
    const password = String(body.password ?? '')
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName ?? '' },
    })
    if (error || !created.user) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? 'Could not create user.' },
        { status: 400 }
      )
    }
    profileId = created.user.id
  } else {
    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (!prof) {
      return NextResponse.json(
        { ok: false, error: 'No user with that email. Ask them to sign up first.' },
        { status: 404 }
      )
    }
    profileId = prof.id
  }

  // Promote: legacy role + RM record + rm user_role.
  await admin.from('profiles').update({ role: 'rm' }).eq('id', profileId)

  const { data: rm, error: rmErr } = await admin
    .from('relationship_managers')
    .upsert(
      {
        profile_id: profileId,
        branch_id: branchId,
        is_active: true,
        max_daily_appointments: body.maxDaily ?? 8,
      },
      { onConflict: 'profile_id' }
    )
    .select('id')
    .single()
  if (rmErr || !rm) {
    return NextResponse.json(
      { ok: false, error: 'Could not create the RM record.' },
      { status: 500 }
    )
  }

  // Assign the global 'rm' role if not already present.
  const { data: rmRole } = await admin.from('roles').select('id').eq('name', 'rm').single()
  if (rmRole) {
    const { data: existing } = await admin
      .from('user_roles')
      .select('id')
      .eq('profile_id', profileId)
      .eq('role_id', rmRole.id)
      .eq('scope_type', 'global')
      .maybeSingle()
    if (!existing) {
      await admin
        .from('user_roles')
        .insert({ profile_id: profileId, role_id: rmRole.id, scope_type: 'global' })
    }
  }

  return NextResponse.json({ ok: true, rmId: rm.id })
}
