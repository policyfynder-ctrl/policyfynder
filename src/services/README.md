# Services

All Supabase queries live here. Components never call Supabase directly — they call a service function.

## Why

Keeping queries in one place makes them easy to find, test, and update. If the query needs to change (e.g. adding a join), there's one place to change it instead of hunting through components.

## Structure

```
services/
  leads.ts      # All queries for the leads table
  quotes.ts     # All queries for the quotes table
  policies.ts   # All queries for the policies table
  carriers.ts   # All queries for the carriers table
  activities.ts # All queries for the activities table
  agents.ts     # All queries for the agents table
```

## Pattern

Each file exports async functions that accept a Supabase client and query parameters:

```ts
import { createClient } from '@/lib/supabase/server'

export async function getLeads(status?: LeadStatus) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', status ?? 'new')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```
