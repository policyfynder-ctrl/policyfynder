import { listTeams } from '@/services/teams'
import { hasPermission } from '@/services/roles'
import { listManageableBranches } from '@/services/branches'
import { TeamList } from '@/components/features/teams/TeamList'
import { CreateTeamForm } from '@/components/features/teams/CreateTeamForm'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Teams — PolicyFynder' }

export default async function TeamsPage() {
  const [teams, canManageBranch] = await Promise.all([
    listTeams(),
    hasPermission('teams', 'manage_branch'),
  ])
  const branches = canManageBranch ? await listManageableBranches() : []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Teams</h1>
        <p className="text-muted-foreground text-sm">
          {teams.length} team{teams.length === 1 ? '' : 's'} in your view.
        </p>
      </div>

      {canManageBranch && (
        <Card>
          <CardHeader>
            <CardTitle>Create a team</CardTitle>
            <CardDescription>Teams group RMs within a branch.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTeamForm branches={branches} />
          </CardContent>
        </Card>
      )}

      <TeamList teams={teams} />
    </div>
  )
}
