import { getCurrentViewer } from '@/services/roles'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RoleBadge } from '@/components/layout/RoleBadge'
import { UpcomingAppointments } from '@/components/features/dashboard/UpcomingAppointments'
import { roleLabel } from '@/lib/roles'

export const metadata = { title: 'Dashboard — PolicyFynder' }

// Dashboard landing: welcome + a transparent summary of the current user's role
// and permission set. The role-specific widgets (pipeline, follow-ups, etc.)
// arrive in later milestones.
export default async function DashboardPage() {
  const viewer = await getCurrentViewer()
  if (!viewer) return null // layout already redirects unauthenticated users

  // Group "resource.action" strings by resource for a readable summary.
  const grouped = viewer.permissions.reduce<Record<string, string[]>>((acc, perm) => {
    const [resource, action] = perm.split('.')
    ;(acc[resource] ??= []).push(action)
    return acc
  }, {})
  const resources = Object.keys(grouped).sort()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome{viewer.fullName ? `, ${viewer.fullName}` : ''}
          </CardTitle>
          <CardDescription>
            You&apos;re signed in to PolicyFynder. Your menu and access are tailored to your role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>Signed in as</span>
            <span className="text-foreground font-medium">{viewer.email}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your role</CardTitle>
            <CardDescription>Roles assigned to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Primary</p>
              <RoleBadge role={viewer.primaryRole} />
            </div>
            {viewer.roles.length > 1 && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs">All roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {viewer.roles.map((r) => (
                    <Badge key={r} variant="outline">
                      {roleLabel(r)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your permissions</CardTitle>
            <CardDescription>
              {viewer.permissions.length} permission
              {viewer.permissions.length === 1 ? '' : 's'} across {resources.length} area
              {resources.length === 1 ? '' : 's'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resources.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No permissions found for your account.
              </p>
            ) : (
              resources.map((resource) => (
                <div key={resource}>
                  <p className="mb-1 text-xs font-medium capitalize">{resource}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {grouped[resource].sort().map((action) => (
                      <Badge key={action} variant="muted">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <UpcomingAppointments />
    </div>
  )
}
