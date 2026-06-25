# Auth Flow — PolicyFynder

## Provider

NextAuth.js with Email (magic link) + Google OAuth providers.

## Session Model

JWT sessions stored in an HttpOnly cookie. Session contains:

```ts
{
  user: {
    id: string // Agent.id
    email: string
    name: string
    organizationId: string
    role: 'ADMIN' | 'AGENT'
  }
}
```

## Route Protection

### Middleware (`middleware.ts`)

Protects all `/dashboard/*` routes. Redirects unauthenticated requests to `/login`.

```ts
export { auth as middleware } from '@/lib/auth'
export const config = { matcher: ['/dashboard/:path*', '/api/trpc/:path*'] }
```

### tRPC Procedures

Every procedure that accesses data calls `protectedProcedure` (not `publicProcedure`):

```ts
// src/lib/trpc/trpc.ts
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, session: ctx.session } })
})
```

### Authorization (Row-Level)

Multi-tenant isolation enforced in every query:

```ts
// Always scope queries to the agent's organization
const leads = await ctx.db.lead.findMany({
  where: {
    organizationId: ctx.session.user.organizationId,
    deletedAt: null,
  },
})
```

## Role-Based Access

| Action             | AGENT | ADMIN |
| ------------------ | ----- | ----- |
| View own leads     | ✓     | ✓     |
| View all org leads | —     | ✓     |
| Manage carriers    | —     | ✓     |
| Invite agents      | —     | ✓     |
| View org reports   | —     | ✓     |

Role checked in procedures, not just the UI.

## Magic Link Flow

1. User submits email on `/login`
2. Resend sends a sign-in link (valid 10 minutes)
3. User clicks link → NextAuth verifies token → session created
4. Redirect to `/dashboard`
