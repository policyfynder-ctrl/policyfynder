// Full end-to-end production simulation (Milestone 15).
//
// Runs the entire application flow against the LOCAL stack (never production data):
// landing → book → lead → RM assignment → RM login → convert → policy → portal →
// communication (dry-run) → reports → renewals → permissions.
//
// Requires: local Supabase running + the app dev server on BASE_URL with LOCAL env.
// Env in: SUPABASE_URL, ANON_KEY, SERVICE_KEY, BASE_URL.
// Fixtures use the zz15 email prefix + a per-run nonce; cleaned up in finally.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const ANON = process.env.ANON_KEY
const SROLE = process.env.SERVICE_KEY
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3030').replace(/\/$/, '')
const PW = 'Passw0rd!123'
const NONCE = Date.now().toString(36)
const admin = createClient(URL, SROLE, { auth: { persistSession: false } })

let pass = 0, fail = 0
const ok = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`); if (c) pass++; else fail++ }
const email = (r) => `zz15${r}.${NONCE}@test.local`
const createdIds = []

async function mkUser(role, em) {
  const { data, error } = await admin.auth.admin.createUser({ email: em, password: PW, email_confirm: true })
  if (error) throw new Error(`createUser ${em}: ${error.message}`)
  createdIds.push(data.user.id)
  await admin.from('profiles').update({ role, full_name: role + '-' + NONCE }).eq('id', data.user.id)
  return data.user.id
}
async function signIn(em) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email: em, password: PW })
  if (error) throw new Error(`signin ${em}: ${error.message}`)
  return c
}

async function cleanup() {
  // notifications created for/by this run's users (delivery_logs cascade)
  for (const id of createdIds) {
    await admin.from('notifications').delete().eq('recipient_id', id)
    await admin.from('notifications').delete().eq('created_by', id)
  }
  await admin.from('policies').delete().like('policy_number', 'E2E15-%')
  // leads created by booking/this run (by email) + their FK-linked rows
  const { data: leads } = await admin.from('leads').select('id').like('email', 'zz15%')
  for (const l of leads ?? []) {
    await admin.from('appointments').delete().eq('lead_id', l.id)
    await admin.from('lead_stage_history').delete().eq('lead_id', l.id)
    await admin.from('lead_assignments').delete().eq('lead_id', l.id)
    await admin.from('lead_notes').delete().eq('lead_id', l.id)
    await admin.from('activity_logs').delete().eq('entity_type', 'lead').eq('entity_id', l.id)
    await admin.from('leads').delete().eq('id', l.id)
  }
  for (const id of createdIds) {
    await admin.from('communication_preferences').delete().eq('profile_id', id)
    await admin.from('relationship_managers').delete().eq('profile_id', id)
    await admin.from('user_roles').delete().eq('profile_id', id)
    await admin.from('activity_logs').delete().eq('actor_id', id) // actor FK on profiles
  }
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) break
    for (const u of data.users) if (u.email?.startsWith('zz15')) await admin.auth.admin.deleteUser(u.id).catch(() => {})
    if (data.users.length < 200) break
  }
}

async function main() {
  await cleanup()
  const { data: branch } = await admin.from('branches').select('id, code, name').eq('is_active', true).order('name').limit(1).single()
  const { data: rmRole } = await admin.from('roles').select('id').eq('name', 'rm').single()
  const { data: prod } = await admin.from('insurance_products').select('id, slug').limit(1).single()
  const { data: ins } = await admin.from('insurers').select('id').limit(1).single()

  // RM (controllable) + a stranger RM + a customer
  const rmEmail = email('rm'), strEmail = email('stranger'), custEmail = email('cust')
  const rmId = await mkUser('rm', rmEmail)
  const strId = await mkUser('rm', strEmail)
  const custId = await mkUser('customer', custEmail)
  const { data: rmRec } = await admin.from('relationship_managers').insert({ profile_id: rmId, branch_id: branch.id, is_active: true }).select('id').single()
  await admin.from('relationship_managers').insert({ profile_id: strId, branch_id: branch.id, is_active: true })
  // Give the simulated RM a Mon–Fri schedule so the public booking has availability.
  await admin.from('rm_schedules').insert(
    [1, 2, 3, 4, 5].map((dow) => ({
      rm_id: rmRec.id, day_of_week: dow, start_time: '09:00:00', end_time: '17:00:00',
      is_active: true, effective_from: '2026-01-01',
    }))
  )
  await admin.from('user_roles').insert([
    { profile_id: rmId, role_id: rmRole.id, scope_type: 'global' },
    { profile_id: strId, role_id: rmRole.id, scope_type: 'global' },
  ]).then(() => {}, () => {})

  // 1. Landing
  const r1 = await fetch(`${BASE}/`)
  ok('1. Landing page renders', r1.status === 200, `HTTP ${r1.status}`)

  // 2. Book a free consultation via the public API (branch hidden — server assigns)
  const { data: slots } = await admin.from('v_slot_availability').select('slot_date, slot_start, slot_end, available_spots').eq('branch_id', branch.id).gt('available_spots', 0).order('slot_date').limit(20)
  const now = new Date()
  const slot = (slots ?? []).find((s) => new Date(`${s.slot_date}T${s.slot_start}`) > now)
  let bookingOk = false, leadEmail = email('lead')
  if (slot) {
    const res = await fetch(`${BASE}/api/book`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchCode: branch.code, slotDate: slot.slot_date, slotStart: slot.slot_start, slotEnd: slot.slot_end, firstName: 'E2E', lastName: 'Customer', email: leadEmail, phone: '919000015000', insuranceInterest: prod ? [prod.slug] : [] }),
    })
    const j = await res.json().catch(() => ({}))
    bookingOk = res.ok && j.ok
    ok('2. Book free consultation (public /api/book)', bookingOk, j.error || `HTTP ${res.status}`)
  } else {
    ok('2. Book free consultation', false, 'no bookable slot in local stack')
  }

  // 3. Lead created
  const { data: lead } = await admin.from('leads').select('id, branch_id, status, source').eq('email', leadEmail).maybeSingle()
  ok('3. Lead created from booking', !!lead, lead ? `status=${lead.status}` : 'no lead')

  // 4. RM auto-assigned on the appointment
  const { data: appt } = lead ? await admin.from('appointments').select('id, rm_id').eq('lead_id', lead.id).maybeSingle() : { data: null }
  ok('4. RM auto-assigned to appointment', !!appt?.rm_id, appt?.rm_id ? 'assigned' : 'none')

  // Assign the lead to our controllable RM (simulates internal routing) for staff steps
  if (lead) await admin.from('leads').update({ assigned_rm_id: rmRec.id }).eq('id', lead.id)
  if (appt) await admin.from('appointments').update({ rm_id: rmRec.id }).eq('id', appt.id)

  // 5. Log in as RM
  let rmC = null
  try { rmC = await signIn(rmEmail); ok('5. RM login', true) } catch (e) { ok('5. RM login', false, e.message) }

  // 6. Convert lead (as RM, RLS-scoped)
  if (rmC && lead) {
    const { error } = await rmC.from('leads').update({ status: 'converted' }).eq('id', lead.id)
    const { data: chk } = await admin.from('leads').select('status').eq('id', lead.id).single()
    ok('6. RM converts lead', !error && chk.status === 'converted', error?.message || `status=${chk?.status}`)
  } else ok('6. RM converts lead', false, 'precondition failed')

  // 7. Create a policy (as RM, scoped insert)
  const polNum = `E2E15-${NONCE}`
  let policyId = null
  if (rmC && lead) {
    const { data, error } = await rmC.from('policies').insert({
      policy_number: polNum, product_id: prod?.id, insurer_id: ins?.id, holder_name: 'E2E Customer',
      holder_email: leadEmail, status: 'active', assigned_rm_id: rmRec.id, branch_id: branch.id,
      customer_profile_id: custId, lead_id: lead.id, renewal_date: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
    }).select('id').maybeSingle()
    policyId = data?.id ?? null
    ok('7. RM creates policy', !!policyId && !error, error?.message || 'created')
  } else ok('7. RM creates policy', false, 'precondition failed')

  // 8. Customer portal shows the policy (RLS = own)
  try {
    const custC = await signIn(custEmail)
    const { data: myPolicies } = await custC.from('policies').select('id, policy_number').eq('id', policyId ?? '00000000-0000-0000-0000-000000000000')
    ok('8. Customer portal shows own policy', (myPolicies ?? []).length === 1)
    // 12a. Customer cannot see leads (no access)
    const { data: custLeads } = await custC.from('leads').select('id').limit(5)
    ok('12. Permissions: customer cannot list leads', (custLeads ?? []).length === 0)
  } catch (e) { ok('8. Customer portal shows own policy', false, e.message) }

  // 9. Queue a communication (dry-run; in_app always allowed)
  if (rmC && policyId) {
    const { error } = await rmC.from('notifications').insert({
      recipient_id: custId, policy_id: policyId, type: 'custom', channel: 'in_app',
      category: 'follow_up', status: 'pending', created_by: rmId,
    })
    ok('9. RM queues communication (dry-run)', !error, error?.message || 'queued pending')
  } else ok('9. RM queues communication (dry-run)', false, 'precondition failed')

  // 10. Reports reflect data (scoped function)
  if (rmC) {
    const { data, error } = await rmC.rpc('report_overview')
    ok('10. Reports return data (report_overview)', !error && !!data, error?.message || 'ok')
  } else ok('10. Reports return data', false, 'no RM session')

  // 11. Renewals view (policy due within window visible to RM)
  if (rmC && policyId) {
    const { data } = await rmC.from('policies').select('id').eq('id', policyId).not('renewal_date', 'is', null).is('renewal_completed_at', null)
    ok('11. Renewals: policy appears in renewal window', (data ?? []).length === 1)
  } else ok('11. Renewals', false, 'precondition failed')

  // 12b. Stranger RM cannot see this RM's lead/policy
  try {
    const strC = await signIn(strEmail)
    const { data: sLead } = await strC.from('leads').select('id').eq('id', lead?.id ?? '0').maybeSingle()
    const { data: sPol } = await strC.from('policies').select('id').eq('id', policyId ?? '0').maybeSingle()
    ok('12. Permissions: unrelated RM cannot see lead/policy', !sLead && !sPol)
  } catch (e) { ok('12. Permissions: unrelated RM scope', false, e.message) }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
}

main().catch((e) => { console.error('FATAL', e); fail++ }).finally(async () => {
  await cleanup(); console.log('cleanup done'); process.exit(fail > 0 ? 1 : 0)
})
