'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// Triggers renewal-reminder generation via the service-role admin API
// (/api/admin/renewals). Idempotent server-side, so repeated clicks are safe.
export function GenerateRemindersButton({ daysAhead = 30 }: { daysAhead?: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string>()

  async function generate() {
    setPending(true)
    setMsg(undefined)
    try {
      const res = await fetch('/api/admin/renewals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAhead }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? 'Could not generate reminders.')
      } else {
        setMsg(`Created ${data.tasksCreated} new renewal task${data.tasksCreated === 1 ? '' : 's'}.`)
        router.refresh()
      }
    } catch {
      setMsg('Network error. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" onClick={generate} disabled={pending}>
        {pending ? 'Generating…' : `Generate reminders (${daysAhead}d)`}
      </Button>
      {msg && <span className="text-muted-foreground text-xs">{msg}</span>}
    </div>
  )
}
