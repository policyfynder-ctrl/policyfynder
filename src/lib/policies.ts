import type { PolicyStatus } from '@/types'

// Pure policy helpers (no server imports) — usable in client & server components.
//
// The policy_status enum is fixed: draft → active → lapsed → cancelled → expired.
// Changing it requires a migration + product decision. PolicyFynder does not track
// payments, so there is no payment-frequency concept here.

export const POLICY_STATUSES: PolicyStatus[] = [
  'draft',
  'active',
  'lapsed',
  'cancelled',
  'expired',
]

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  lapsed: 'Lapsed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export function policyStatusLabel(s: PolicyStatus): string {
  return POLICY_STATUS_LABELS[s] ?? s
}

export function isPolicyStatus(value: string): value is PolicyStatus {
  return (POLICY_STATUSES as string[]).includes(value)
}

export function policyStatusVariant(
  s: PolicyStatus
): 'default' | 'secondary' | 'outline' | 'muted' {
  switch (s) {
    case 'active':
      return 'default'
    case 'draft':
      return 'secondary'
    case 'cancelled':
    case 'expired':
      return 'muted'
    default:
      return 'outline'
  }
}

// Money is stored as integer cents/paise (mirrors leads.converted_value_cents).
// Premium / sum assured are REFERENCE figures from the insurer's policy — not a
// billing amount PolicyFynder collects.
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

// Parse a user-entered currency amount (major units) into integer cents. Returns
// null for blank, NaN for invalid.
export function parseMoneyToCents(value: string | null | undefined): number | null | typeof NaN {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const n = Number(raw.replace(/[, ]/g, ''))
  if (!Number.isFinite(n) || n < 0) return NaN
  return Math.round(n * 100)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
