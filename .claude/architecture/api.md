# API Design — PolicyFynder

## Transport

tRPC over HTTP. All procedures accessible at `/api/trpc/[trpc]`.

## Router Structure

```
src/lib/trpc/routers/
  index.ts          # Root router — merges all sub-routers
  leads.ts          # lead.*
  quotes.ts         # quote.*
  policies.ts       # policy.*
  carriers.ts       # carrier.*
  agents.ts         # agent.*
  activities.ts     # activity.*
  dashboard.ts      # dashboard.* (aggregates / stats)
```

## Naming Convention

`resource.action` — always singular resource name:

```
lead.list
lead.get
lead.create
lead.update
lead.delete
quote.send
quote.accept
policy.bind
dashboard.summary
```

## Procedure Template

```ts
// src/lib/trpc/routers/leads.ts
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { createLeadSchema, updateLeadSchema } from '../schemas/lead'

export const leadsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ status: LeadStatusSchema.optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.lead.findMany({
        where: {
          organizationId: ctx.session.user.organizationId,
          status: input.status,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  create: protectedProcedure.input(createLeadSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.lead.create({
      data: {
        ...input,
        agentId: ctx.session.user.id,
        organizationId: ctx.session.user.organizationId,
      },
    })
  }),
})
```

## Input Validation

All inputs validated with Zod. Schemas live in `src/lib/trpc/schemas/` and are shared with frontend forms.

## Error Handling

| Scenario                    | TRPCError code          |
| --------------------------- | ----------------------- |
| Not authenticated           | `UNAUTHORIZED`          |
| Not authorized for resource | `FORBIDDEN`             |
| Resource not found          | `NOT_FOUND`             |
| Invalid input (beyond Zod)  | `BAD_REQUEST`           |
| Unexpected server error     | `INTERNAL_SERVER_ERROR` |

Never return raw Prisma errors to the client.

## Client Usage (React)

```tsx
// Query
const { data, isLoading } = api.lead.list.useQuery({ status: 'NEW' })

// Mutation
const create = api.lead.create.useMutation({
  onSuccess: () => utils.lead.list.invalidate(),
})
create.mutate({ firstName: 'Jane', ... })
```
