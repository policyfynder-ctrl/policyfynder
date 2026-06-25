import { Badge } from '@/components/ui/badge'
import { roleLabel } from '@/lib/roles'
import type { UserRoleName } from '@/types'

// Displays a user's (primary) role. Falls back to a muted "No role" when the
// user has no role assignment.
export function RoleBadge({ role }: { role: UserRoleName | null }) {
  if (!role) {
    return <Badge variant="muted">No role</Badge>
  }
  return <Badge variant="secondary">{roleLabel(role)}</Badge>
}
