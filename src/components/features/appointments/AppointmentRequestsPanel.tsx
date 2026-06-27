import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { listRequestsForAppointment } from '@/services/changeRequests'
import { resolveRequestAction } from '@/app/dashboard/appointments/actions'

// Staff panel: pending customer change requests for this appointment, with
// approve/decline. Approving a cancel also cancels the appointment. RLS gates
// whether the caller may resolve.
export async function AppointmentRequestsPanel({ appointmentId }: { appointmentId: string }) {
  const requests = await listRequestsForAppointment(appointmentId)
  const pending = requests.filter((r) => r.status === 'pending')
  if (pending.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer change requests</CardTitle>
        <CardDescription>Approving a cancellation will cancel this appointment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.map((r) => (
          <div key={r.id} className="border-border flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <div>
              <Badge variant={r.type === 'cancel' ? 'default' : 'secondary'}>
                {r.type === 'cancel' ? 'Cancellation' : 'Reschedule'}
              </Badge>
              {r.type === 'reschedule' && r.preferred_date && (
                <span className="text-muted-foreground ml-2 text-xs">
                  prefers {r.preferred_date}
                  {r.preferred_time ? ` ${r.preferred_time}` : ''}
                </span>
              )}
              {r.reason && <p className="text-muted-foreground mt-1 text-xs">“{r.reason}”</p>}
            </div>
            <div className="flex gap-2">
              <form action={resolveRequestAction}>
                <input type="hidden" name="request_id" value={r.id} />
                <input type="hidden" name="appointment_id" value={appointmentId} />
                <input type="hidden" name="decision" value="approved" />
                <button type="submit" className={buttonVariants({ size: 'sm' }) + ' h-7 px-2 text-xs'}>
                  Approve
                </button>
              </form>
              <form action={resolveRequestAction}>
                <input type="hidden" name="request_id" value={r.id} />
                <input type="hidden" name="appointment_id" value={appointmentId} />
                <input type="hidden" name="decision" value="declined" />
                <button type="submit" className={buttonVariants({ size: 'sm', variant: 'outline' }) + ' h-7 px-2 text-xs'}>
                  Decline
                </button>
              </form>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
