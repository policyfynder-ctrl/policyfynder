import type { AppointmentStatus } from '@/types'

// Pure appointment helpers (no server imports).

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]

// Statuses an operator can set directly. 'rescheduled' is set by the reschedule
// flow (not chosen manually); 'scheduled' is the booked default.
export const ASSIGNABLE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  rescheduled: 'Rescheduled',
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status
}

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as string[]).includes(value)
}

export function appointmentStatusVariant(
  status: AppointmentStatus
): 'default' | 'secondary' | 'outline' | 'muted' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'confirmed':
      return 'secondary'
    case 'cancelled':
    case 'no_show':
    case 'rescheduled':
      return 'muted'
    default:
      return 'outline'
  }
}

// Friendly labels for activity_logs action strings shown in the timeline.
const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  'appointment.booked': 'Booked',
  'appointment.confirmed': 'Confirmed',
  'appointment.completed': 'Completed',
  'appointment.cancelled': 'Cancelled',
  'appointment.no_show': 'Marked no-show',
  'appointment.rescheduled': 'Rescheduled',
  'appointment.status_changed': 'Status changed',
}

export function activityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action
}
