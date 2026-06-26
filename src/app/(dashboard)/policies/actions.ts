'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createPolicy,
  updatePolicy,
  softDeletePolicy,
  currentRmId,
  type PolicyPatch,
} from '@/services/policies'
import { getLeadCore } from '@/services/leads'
import { isPolicyStatus, parseMoneyToCents } from '@/lib/policies'

export type PolicyActionState = { error?: string; success?: string } | undefined

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}
function orNull(s: string): string | null {
  return s ? s : null
}

// Create a policy. RLS enforces whether the caller may insert in this scope.
// If an originating lead is chosen, its customer details / branch / RM pre-fill
// the policy server-side (so customer contact never needs a profiles read).
export async function createPolicyAction(
  _prev: PolicyActionState,
  fd: FormData
): Promise<PolicyActionState> {
  const policy_number = str(fd, 'policy_number')
  const product_id = str(fd, 'product_id')
  const insurer_id = str(fd, 'insurer_id')
  if (!policy_number) return { error: 'Policy number is required.' }
  if (!product_id) return { error: 'Product is required.' }
  if (!insurer_id) return { error: 'Insurer is required.' }

  let holder_name = str(fd, 'holder_name')
  let holder_email = orNull(str(fd, 'holder_email'))
  let holder_phone = orNull(str(fd, 'holder_phone'))
  let branch_id = orNull(str(fd, 'branch_id'))
  let assigned_rm_id = orNull(str(fd, 'assigned_rm_id'))
  let customer_profile_id: string | null = null
  const lead_id = orNull(str(fd, 'lead_id'))

  if (lead_id) {
    const lead = await getLeadCore(lead_id)
    if (!lead) return { error: 'Selected lead is not accessible.' }
    holder_name = holder_name || `${lead.first_name} ${lead.last_name}`.trim()
    holder_email = holder_email ?? lead.email
    holder_phone = holder_phone ?? lead.phone
    branch_id = branch_id ?? lead.branch_id
    assigned_rm_id = assigned_rm_id ?? lead.assigned_rm_id
    customer_profile_id = lead.customer_profile_id
  }

  if (!holder_name) return { error: 'Customer name is required (or select a lead).' }

  // RMs creating their own policy default the assignment to themselves.
  if (!assigned_rm_id) assigned_rm_id = await currentRmId()

  const premium_cents = parseMoneyToCents(str(fd, 'premium'))
  const sum_assured_cents = parseMoneyToCents(str(fd, 'sum_assured'))
  if (Number.isNaN(premium_cents)) return { error: 'Premium must be a valid amount.' }
  if (Number.isNaN(sum_assured_cents)) return { error: 'Sum assured must be a valid amount.' }

  const status = str(fd, 'status')

  const result = await createPolicy({
    policy_number,
    product_id,
    insurer_id,
    holder_name,
    holder_email,
    holder_phone,
    branch_id,
    assigned_rm_id,
    customer_profile_id,
    lead_id,
    policy_type: orNull(str(fd, 'policy_type')),
    premium_cents: premium_cents as number | null,
    sum_assured_cents: sum_assured_cents as number | null,
    status: isPolicyStatus(status) ? status : 'draft',
    issue_date: orNull(str(fd, 'issue_date')),
    start_date: orNull(str(fd, 'start_date')),
    expiry_date: orNull(str(fd, 'expiry_date')),
    renewal_date: orNull(str(fd, 'renewal_date')),
    notes: orNull(str(fd, 'notes')),
  })

  if (!result.ok) return { error: result.error }
  revalidatePath('/dashboard/policies')
  redirect(`/dashboard/policies/${result.id}`)
}

// Update editable fields. RLS gates the statement; DB triggers log the audit.
export async function updatePolicyAction(
  _prev: PolicyActionState,
  fd: FormData
): Promise<PolicyActionState> {
  const id = str(fd, 'policy_id')
  if (!id) return { error: 'Missing policy id.' }

  const patch: PolicyPatch = {}

  const premium = parseMoneyToCents(str(fd, 'premium'))
  const sum = parseMoneyToCents(str(fd, 'sum_assured'))
  if (Number.isNaN(premium)) return { error: 'Premium must be a valid amount.' }
  if (Number.isNaN(sum)) return { error: 'Sum assured must be a valid amount.' }
  patch.premium_cents = premium as number | null
  patch.sum_assured_cents = sum as number | null
  patch.expiry_date = orNull(str(fd, 'expiry_date'))
  patch.renewal_date = orNull(str(fd, 'renewal_date'))
  patch.renewal_completed_at = orNull(str(fd, 'renewal_completed_at'))
  patch.last_contacted_at = orNull(str(fd, 'last_contacted_at'))

  const status = str(fd, 'status')
  if (isPolicyStatus(status)) patch.status = status

  const rm = str(fd, 'assigned_rm_id')
  patch.assigned_rm_id = rm ? rm : null

  const result = await updatePolicy(id, patch)
  if (!result.ok) return { error: result.error }

  revalidatePath(`/dashboard/policies/${id}`)
  revalidatePath('/dashboard/policies')
  return { success: 'Policy updated.' }
}

// Soft delete (never a hard delete).
export async function deletePolicyAction(fd: FormData): Promise<void> {
  const id = str(fd, 'policy_id')
  if (!id) return
  const result = await softDeletePolicy(id)
  if (result.ok) {
    revalidatePath('/dashboard/policies')
    redirect('/dashboard/policies')
  }
}
