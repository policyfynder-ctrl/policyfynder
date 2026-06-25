import { Badge } from '@/components/ui/badge'
import { appointmentStatusLabel, appointmentStatusVariant } from '@/lib/appointments'
import type { AppointmentStatus } from '@/types'

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={appointmentStatusVariant(status)}>{appointmentStatusLabel(status)}</Badge>
}
