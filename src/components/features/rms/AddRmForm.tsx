'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/features/auth/FormField'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'

// Onboard an RM — promote an existing user or create a new login. Posts to the
// service-role API route /api/admin/rms (privileged work stays server-side).
export function AddRmForm({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<'promote' | 'create'>('promote')
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    setSuccess(undefined)
    const fd = new FormData(e.currentTarget)
    setPending(true)
    try {
      const res = await fetch('/api/admin/rms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          email: fd.get('email'),
          password: fd.get('password'),
          fullName: fd.get('full_name'),
          branchId: fd.get('branch_id'),
          maxDaily: Number(fd.get('max_daily')) || 8,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not add RM.')
      } else {
        setSuccess('RM added.')
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (branches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        You don&apos;t manage any branches, so you can&apos;t add RMs.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <FormSuccess message={success} />

      <div className="flex gap-2 text-sm">
        {(['promote', 'create'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              'rounded-md border px-3 py-1.5 transition-colors ' +
              (mode === m
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted')
            }
          >
            {m === 'promote' ? 'Promote existing user' : 'Create new login'}
          </button>
        ))}
      </div>

      <FormField label="Email" name="email" type="email" required />
      {mode === 'create' && (
        <>
          <FormField label="Full name" name="full_name" type="text" />
          <FormField
            label="Temporary password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
          />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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
        <FormField label="Max daily appointments" name="max_daily" type="number" defaultValue={8} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'promote' ? 'Promote to RM' : 'Create RM'}
      </Button>
    </form>
  )
}
