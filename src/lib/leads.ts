import type { LeadStatus } from '@/types'

// Pure lead helpers (no server imports) — usable in client & server components.
//
// NOTE: the DB `lead_status` enum is the fixed pipeline
//   new → scheduled → contacted → proposal_sent → converted → lost
// There is no separate "qualified" state in the schema. "converted" is surfaced
// as "Won". Changing this set requires a migration + a product decision.

export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'scheduled',
  'contacted',
  'proposal_sent',
  'converted',
  'lost',
]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  scheduled: 'Scheduled',
  contacted: 'Contacted',
  proposal_sent: 'Proposal Sent',
  converted: 'Won',
  lost: 'Lost',
}

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS_LABELS[status] ?? status
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as string[]).includes(value)
}

// Badge variant per status (maps to ui/badge variants).
export function leadStatusVariant(
  status: LeadStatus
): 'default' | 'secondary' | 'outline' | 'muted' {
  switch (status) {
    case 'converted':
      return 'default'
    case 'lost':
      return 'muted'
    case 'new':
      return 'secondary'
    default:
      return 'outline'
  }
}
