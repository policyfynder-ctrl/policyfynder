import { Badge } from '@/components/ui/badge'
import { leadStatusLabel, leadStatusVariant } from '@/lib/leads'
import type { LeadStatus } from '@/types'

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={leadStatusVariant(status)}>{leadStatusLabel(status)}</Badge>
}
