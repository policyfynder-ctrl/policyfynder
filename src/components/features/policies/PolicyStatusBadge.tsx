import { Badge } from '@/components/ui/badge'
import { policyStatusLabel, policyStatusVariant } from '@/lib/policies'
import type { PolicyStatus } from '@/types'

export function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  return <Badge variant={policyStatusVariant(status)}>{policyStatusLabel(status)}</Badge>
}
