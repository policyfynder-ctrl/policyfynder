import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTeam, listAssignableRms } from '@/services/teams'
import { hasPermission } from '@/services/roles'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeamMemberManager } from '@/components/features/teams/TeamMemberManager'

export const metadata = { title: 'Team — PolicyFynder' }

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [team, canBranch, canOwn] = await Promise.all([
    getTeam(id),
    hasPermission('teams', 'manage_branch'),
    hasPermission('teams', 'manage_own'),
  ])
  if (!team) notFound()
  const canManage = canBranch || canOwn

  const assignableRms = canManage && team.branch ? await listAssignableRms(team.branch.id) : []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/teams" className="text-muted-foreground text-sm hover:underline">
          ← Back to teams
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{team.name}</h1>
          {!team.is_active && <Badge variant="muted">Inactive</Badge>}
        </div>
        {team.description && (
          <p className="text-muted-foreground mt-1 text-sm">{team.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>
            <span className="text-muted-foreground">Branch: </span>
            {team.branch?.name ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Team leader: </span>
            {team.leader?.profile?.full_name ?? 'Unassigned'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          {canManage && <CardDescription>Add or remove RMs in this team.</CardDescription>}
        </CardHeader>
        <CardContent>
          {canManage ? (
            <TeamMemberManager
              teamId={team.id}
              members={team.members}
              assignableRms={assignableRms}
            />
          ) : team.members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {team.members.map((m) => (
                <li key={m.id}>{m.rm?.profile?.full_name ?? 'Unnamed RM'}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
