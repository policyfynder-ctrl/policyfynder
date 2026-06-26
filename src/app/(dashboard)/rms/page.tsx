import { listRms } from '@/services/rms'
import { hasPermission } from '@/services/roles'
import { listManageableBranches } from '@/services/branches'
import { RmList } from '@/components/features/rms/RmList'
import { AddRmForm } from '@/components/features/rms/AddRmForm'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Relationship Managers — PolicyFynder' }

export default async function RmsPage() {
  const [rms, canManage] = await Promise.all([listRms(), hasPermission('rms', 'manage_branch')])
  const branches = canManage ? await listManageableBranches() : []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Relationship Managers</h1>
        <p className="text-muted-foreground text-sm">
          {rms.length} RM{rms.length === 1 ? '' : 's'} in your view.
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add a relationship manager</CardTitle>
            <CardDescription>Promote an existing user or create a new login.</CardDescription>
          </CardHeader>
          <CardContent>
            <AddRmForm branches={branches} />
          </CardContent>
        </Card>
      )}

      <RmList rms={rms} />
    </div>
  )
}
