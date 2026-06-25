# Skill: feature

Implement a new PolicyFynder feature end-to-end, following the project's layered architecture.

## When to Use

- User asks to build a new feature, page, or capability
- Adding a new entity or workflow to the system

## Implementation Order

Always build in this order to avoid circular dependencies and incomplete states:

1. **Schema** — add/modify `prisma/schema.prisma`, create migration
2. **Types** — add Zod schemas in `src/lib/trpc/schemas/`
3. **tRPC procedures** — add router in `src/lib/trpc/routers/`
4. **UI components** — build feature component in `src/components/features/`
5. **Page** — wire up in `src/app/(dashboard)/`
6. **Tests** — unit tests for procedures, component tests if complex logic

## Layer Responsibilities

| Layer             | Owns                                            | Does NOT own                  |
| ----------------- | ----------------------------------------------- | ----------------------------- |
| Page (`page.tsx`) | Layout, URL params, auth guard                  | Business logic, data fetching |
| Feature component | Data fetching (tRPC hooks), user interaction    | Database access               |
| tRPC procedure    | Input validation, authorization, business logic | UI concerns                   |
| Prisma model      | Data shape and relations                        | Validation logic              |

## Standard Feature Component Shape

```tsx
// src/components/features/MyFeature/MyFeature.tsx
'use client'

import { api } from '@/lib/trpc/client'

export function MyFeature({ id }: { id: string }) {
  const { data, isLoading } = api.resource.get.useQuery({ id })
  const mutation = api.resource.update.useMutation()

  if (isLoading) return <LoadingSpinner />
  if (!data) return <EmptyState />

  return (
    // JSX
  )
}
```

## Checklist Before Calling a Feature Done

- [ ] Runs without console errors
- [ ] Loading state handled
- [ ] Empty state handled
- [ ] Error state handled (tRPC error boundary or inline)
- [ ] Mobile layout checked (Tailwind responsive classes)
- [ ] At least one unit test for the tRPC procedure
