import Link from 'next/link'
import { requirePermission } from '@/services/roles'
import { listAssignableRms } from '@/services/policies'
import { listInsurers } from '@/services/insurers'
import { listProducts } from '@/services/products'
import { listManageableBranches } from '@/services/branches'
import { listLeadOptions } from '@/services/leads'
import { NewPolicyForm } from '@/components/features/policies/NewPolicyForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'New policy — PolicyFynder' }

export default async function NewPolicyPage() {
  await requirePermission('policies', 'create') // UX gate; RLS is the real boundary

  const [products, insurers, branches, assignableRms, leadOptions] = await Promise.all([
    listProducts(),
    listInsurers(),
    listManageableBranches(),
    listAssignableRms(),
    listLeadOptions(),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/policies" className="text-muted-foreground text-sm hover:underline">
          ← Back to policies
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">New policy</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPolicyForm
            products={products}
            insurers={insurers}
            branches={branches}
            assignableRms={assignableRms}
            leadOptions={leadOptions}
          />
        </CardContent>
      </Card>
    </div>
  )
}
