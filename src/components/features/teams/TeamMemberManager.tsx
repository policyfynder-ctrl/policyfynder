'use client'

import { useActionState } from 'react'
import {
  addMemberAction,
  removeMemberForm,
  type TeamActionState,
} from '@/app/dashboard/teams/actions'
import { Button } from '@/components/ui/button'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import type { TeamMember } from '@/services/teams'

export function TeamMemberManager({
  teamId,
  members,
  assignableRms,
}: {
  teamId: string
  members: TeamMember[]
  assignableRms: { id: string; name: string }[]
}) {
  const [state, action, pending] = useActionState<TeamActionState, FormData>(
    addMemberAction,
    undefined
  )

  const memberRmIds = new Set(members.map((m) => m.rm_id))
  const candidates = assignableRms.filter((r) => !memberRmIds.has(r.id))

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-muted-foreground text-sm">No members yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li
              key={m.id}
              className="border-border flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
            >
              <span>{m.rm?.profile?.full_name ?? 'Unnamed RM'}</span>
              <form action={removeMemberForm}>
                <input type="hidden" name="member_id" value={m.id} />
                <input type="hidden" name="team_id" value={teamId} />
                <Button type="submit" size="xs" variant="ghost">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="border-border space-y-2 border-t pt-3">
        <FormError message={state?.error} />
        <FormSuccess message={state?.success} />
        <div className="flex items-end gap-2">
          <input type="hidden" name="team_id" value={teamId} />
          <select
            name="rm_id"
            className="border-border bg-background h-9 flex-1 rounded-lg border px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              {candidates.length ? 'Select an RM…' : 'No available RMs'}
            </option>
            {candidates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending || candidates.length === 0}>
            {pending ? 'Adding…' : 'Add member'}
          </Button>
        </div>
      </form>
    </div>
  )
}
