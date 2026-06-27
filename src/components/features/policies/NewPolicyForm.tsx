'use client'

import { useActionState } from 'react'
import { createPolicyAction, type PolicyActionState } from '@/app/dashboard/policies/actions'
import { POLICY_STATUSES, policyStatusLabel } from '@/lib/policies'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/features/auth/FormBanner'

type Option = { id: string; name: string }

type Props = {
  products: Option[]
  insurers: Option[]
  branches: Option[]
  assignableRms: Option[]
  leadOptions: { id: string; label: string }[]
}

const ctrl =
  'border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-3 text-sm focus-visible:ring-3 focus-visible:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

// Create a policy. RLS enforces insert scope on the server; on success the action
// redirects to the new policy. Selecting an originating lead pre-fills customer
// details server-side.
export function NewPolicyForm(props: Props) {
  const [state, action, pending] = useActionState<PolicyActionState, FormData>(
    createPolicyAction,
    undefined
  )

  return (
    <form action={action} className="space-y-6">
      <FormError message={state?.error} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Policy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Policy number (from insurer) *">
            <input name="policy_number" required className={ctrl} placeholder="e.g. HDF123456789" />
          </Field>
          <Field label="Policy type">
            <input name="policy_type" className={ctrl} placeholder="e.g. Comprehensive, Term" />
          </Field>
          <Field label="Product *">
            <select name="product_id" required defaultValue="" className={ctrl}>
              <option value="" disabled>
                Select product…
              </option>
              {props.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Insurer *">
            <select name="insurer_id" required defaultValue="" className={ctrl}>
              <option value="" disabled>
                Select insurer…
              </option>
              {props.insurers.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link to existing lead (optional)">
            <select name="lead_id" defaultValue="" className={ctrl}>
              <option value="">No linked lead</option>
              {props.leadOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer name">
            <input name="holder_name" className={ctrl} placeholder="Required if no lead selected" />
          </Field>
          <Field label="Customer email">
            <input name="holder_email" type="email" className={ctrl} />
          </Field>
          <Field label="Customer phone">
            <input name="holder_phone" className={ctrl} />
          </Field>
        </div>
        <p className="text-muted-foreground text-xs">
          Linking a lead fills in the customer details, branch, and RM automatically.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Premium (₹)">
            <input name="premium" type="number" min="0" step="0.01" className={ctrl} />
          </Field>
          <Field label="Sum assured (₹)">
            <input name="sum_assured" type="number" min="0" step="0.01" className={ctrl} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="draft" className={ctrl}>
              {POLICY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {policyStatusLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Issue date">
            <input name="issue_date" type="date" className={ctrl} />
          </Field>
          <Field label="Start date">
            <input name="start_date" type="date" className={ctrl} />
          </Field>
          <Field label="Expiry date">
            <input name="expiry_date" type="date" className={ctrl} />
          </Field>
          <Field label="Renewal date">
            <input name="renewal_date" type="date" className={ctrl} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Assignment</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {props.branches.length > 0 && (
            <Field label="Branch">
              <select name="branch_id" defaultValue="" className={ctrl}>
                <option value="">Use lead / default</option>
                {props.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Assigned RM">
            <select name="assigned_rm_id" defaultValue="" className={ctrl}>
              <option value="">Assign to me / from lead</option>
              {props.assignableRms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <input name="notes" className={ctrl} />
          </Field>
        </div>
      </section>

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create policy'}
      </Button>
    </form>
  )
}
