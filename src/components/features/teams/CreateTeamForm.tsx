'use client'

import { useActionState } from 'react'
import { createTeamAction, type TeamActionState } from '@/app/dashboard/teams/actions'
import { FormField } from '@/components/features/auth/FormField'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import { Button } from '@/components/ui/button'

export function CreateTeamForm({ branches }: { branches: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<TeamActionState, FormData>(
    createTeamAction,
    undefined
  )

  if (branches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        You don&apos;t manage any branches, so you can&apos;t create teams.
      </p>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <div className="space-y-1.5">
        <label htmlFor="branch_id" className="text-sm font-medium">
          Branch
        </label>
        <select
          id="branch_id"
          name="branch_id"
          className="border-border bg-background h-9 w-full rounded-lg border px-3 text-sm"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <FormField label="Team name" name="name" type="text" required />
      <FormField label="Description (optional)" name="description" type="text" />
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create team'}
      </Button>
    </form>
  )
}
