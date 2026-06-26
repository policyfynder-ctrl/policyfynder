import { listMyNotifications } from '@/services/portal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Notifications — PolicyFynder' }

function label(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function variant(type: string): 'default' | 'secondary' | 'outline' {
  if (type.includes('renewal')) return 'default'
  if (type.includes('appointment')) return 'secondary'
  return 'outline'
}

export default async function NotificationsPage() {
  const notifications = await listMyNotifications()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm">Renewal reminders, appointment updates, and general messages.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">You have no notifications.</p>
          ) : (
            <ul className="divide-border divide-y">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Badge variant={variant(n.type)}>{label(n.type)}</Badge>
                    {typeof n.payload?.renewal_date === 'string' && (
                      <span className="text-muted-foreground ml-2 text-xs">renews {n.payload.renewal_date}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
