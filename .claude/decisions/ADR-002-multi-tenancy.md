# ADR-002: Multi-Tenancy Approach

**Status**: Accepted  
**Date**: 2026-06-25

## Context

PolicyFynder serves multiple insurance agencies (organizations). Each agency's data must be completely isolated.

## Decision

Shared database, shared schema, row-level tenant isolation via `organizationId` foreign key on all tenant-scoped tables.

## Rationale

- Simplest operational model: one database, standard migrations, no per-tenant provisioning
- `organizationId` filter on every query enforced at the tRPC procedure layer
- Scales to hundreds of organizations without infrastructure changes
- Prisma middleware can enforce tenant scoping as a safety net

## Trade-offs Accepted

- A bug in a procedure could potentially expose cross-tenant data (mitigated by: test coverage, code review, Prisma middleware guard)
- Large organizations with millions of rows will share table scans (mitigated by: composite indexes on `(organizationId, createdAt)`)
- No physical data separation (acceptable: no enterprise contracts requiring data isolation)

## Rejected Alternatives

- **Schema-per-tenant**: Operational complexity (N migration runs), impractical at scale
- **Database-per-tenant**: Cost-prohibitive, extreme operational burden for a small team

## Enforcement Pattern

Every data-access procedure must include `organizationId: ctx.session.user.organizationId` in the where clause. A Prisma middleware validates this at runtime as a safety net.
