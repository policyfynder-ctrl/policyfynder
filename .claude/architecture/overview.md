# Architecture Overview — PolicyFynder

## System Purpose

PolicyFynder is a CRM and policy discovery platform for insurance agents. It centralizes lead management, policy quoting, carrier appetite matching, and client communication in a single workflow.

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│              Browser (Next.js)           │
│  App Router + React + tRPC Client       │
└───────────────┬─────────────────────────┘
                │ HTTPS / tRPC
┌───────────────▼─────────────────────────┐
│         Next.js API Layer               │
│  tRPC Router + NextAuth + Middleware    │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
┌───────▼──────┐ ┌──────▼──────────┐
│  PostgreSQL   │ │  Cloudflare R2  │
│  (via Prisma) │ │  (file storage) │
└──────────────┘ └─────────────────┘
```

## Request Lifecycle

1. User action in browser triggers tRPC mutation or query
2. tRPC client sends typed HTTP request to `/api/trpc/*`
3. NextAuth middleware validates session
4. tRPC procedure validates input (Zod), checks authorization
5. Procedure executes business logic via Prisma
6. Prisma returns typed result; procedure returns to client
7. React Query caches result; UI updates

## Key Architectural Decisions

| Decision             | Choice             | Rationale                                   |
| -------------------- | ------------------ | ------------------------------------------- |
| Full-stack framework | Next.js App Router | Single repo, shared types, excellent DX     |
| API layer            | tRPC               | End-to-end type safety without code gen     |
| ORM                  | Prisma             | Type-safe queries, migration system, studio |
| Auth                 | NextAuth.js        | Flexible providers, session management      |
| Styling              | Tailwind CSS       | Utility-first, consistent design tokens     |

See `.claude/decisions/` for full ADRs.

## Scalability Considerations

- **Now**: Single Vercel deployment, single Railway PostgreSQL instance
- **Later**: Connection pooling via PgBouncer if connection limits hit; read replicas for reporting queries
- **Never**: Don't optimize prematurely. Profile before adding infrastructure.

## Security Boundaries

- All API procedures check `session.user.id` before accessing data
- Multi-tenant isolation: every DB query scoped to `agentId` or `organizationId`
- File uploads: validate MIME type and size before writing to R2; signed URLs for reads
- No secrets in client bundles: only `NEXT_PUBLIC_` vars in browser code
