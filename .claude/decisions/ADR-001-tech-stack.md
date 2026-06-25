# ADR-001: Technology Stack Selection

**Status**: Accepted  
**Date**: 2026-06-25

## Context

PolicyFynder needs a full-stack web application. The stack must support rapid iteration, strong type safety, and be operable by a small team without dedicated DevOps.

## Decision

Next.js 14 (App Router) + tRPC + PostgreSQL/Prisma + Vercel/Railway.

## Rationale

**Next.js App Router** — Server components, layouts, and streaming out of the box. Single repo for frontend and backend reduces coordination overhead.

**tRPC** — End-to-end type safety from DB to UI without REST boilerplate or GraphQL schema maintenance. Type errors surface at compile time, not runtime.

**Prisma** — Typed queries, automatic migrations, Prisma Studio for data inspection. Significantly reduces SQL error surface area.

**Vercel + Railway** — Zero-config deployments tied to git. Railway manages PostgreSQL with backups. Acceptable cost at current scale.

## Trade-offs Accepted

- Vendor lock-in to Vercel's edge network and Railway's pricing
- tRPC is less discoverable than REST for external integrations (mitigated: no external API consumers planned)
- Next.js App Router is relatively new — some ecosystem libraries still catching up

## Rejected Alternatives

- **Remix**: Similar DX but smaller ecosystem; Next.js more established
- **GraphQL**: Overhead of schema definition not justified for a single-client app
- **Django/Rails**: Team proficiency and type safety favor TypeScript throughout
