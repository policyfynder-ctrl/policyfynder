# Hooks

Custom React hooks for client-side state and interactions.

## When to add a hook

Add a hook when the same stateful logic (loading state, error handling, optimistic updates) is needed in more than one component.

## Structure

```
hooks/
  useLeads.ts      # Client-side lead fetching and mutations
  useQuotes.ts     # Client-side quote operations
  usePolicies.ts   # Client-side policy operations
  useAuth.ts       # Current user session
  useToast.ts      # Toast notification helper (re-exported from ShadCN)
```

## Pattern

Hooks use the browser Supabase client and manage loading/error state:

```ts
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/types'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .then(({ data }) => {
        setLeads(data ?? [])
        setLoading(false)
      })
  }, [])

  return { leads, loading }
}
```
