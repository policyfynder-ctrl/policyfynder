# Data Model — PolicyFynder

## Entity Relationship Summary

```
Organization
  └── Agent (many)
        └── Lead (many)
              ├── Quote (many)
              │     └── Policy (0..1)
              └── Activity (many)

Carrier
  ├── Product (many)
  └── Appetite (many)

Quote ──── Carrier (via Product)
```

## Core Entities

### Organization

The top-level tenant. All data is scoped to an organization.

- `id`, `name`, `slug`, `plan`, `createdAt`, `updatedAt`

### Agent

A user who belongs to an organization.

- `id`, `organizationId`, `email`, `name`, `role` (ADMIN | AGENT), `createdAt`, `updatedAt`
- Auth via NextAuth; `email` is the identity key

### Lead

A prospective customer.

- `id`, `agentId`, `organizationId`
- `firstName`, `lastName`, `email`, `phone`
- `status`: `NEW | CONTACTED | QUOTED | BOUND | LOST`
- `lineOfBusiness`: `AUTO | HOME | LIFE | HEALTH | COMMERCIAL`
- `source`: where the lead came from (referral, web, etc.)
- `deletedAt` (soft delete)
- `createdAt`, `updatedAt`

### Quote

A price estimate for a Lead from a specific Carrier/Product.

- `id`, `leadId`, `carrierId`, `productId`, `agentId`
- `premium` (annual, in cents)
- `status`: `DRAFT | SENT | ACCEPTED | DECLINED | EXPIRED`
- `expiresAt`, `sentAt`, `respondedAt`
- `notes`
- `createdAt`, `updatedAt`

### Policy

A bound (active) insurance policy. Created from an accepted Quote.

- `id`, `quoteId`, `leadId`, `carrierId`
- `policyNumber` (carrier-assigned)
- `effectiveDate`, `expirationDate`
- `premium` (in cents)
- `status`: `ACTIVE | CANCELLED | EXPIRED | PENDING`
- `createdAt`, `updatedAt`

### Carrier

An insurance company.

- `id`, `name`, `slug`, `logoUrl`
- `active` (boolean)
- `createdAt`, `updatedAt`

### Product

A specific insurance product offered by a Carrier.

- `id`, `carrierId`, `name`, `lineOfBusiness`
- `active`
- `createdAt`, `updatedAt`

### Activity

Audit log and timeline for a Lead.

- `id`, `leadId`, `agentId`
- `type`: `NOTE | CALL | EMAIL | QUOTE_SENT | STATUS_CHANGE | POLICY_BOUND`
- `body` (text)
- `createdAt`

## Conventions

- Monetary values stored as **integers in cents** (never floats)
- All enums defined in Prisma schema (not as plain strings)
- `deletedAt DateTime?` on Lead, Quote — soft delete; never hard-delete customer data
- Foreign keys always indexed
- `organizationId` on every tenant-scoped model for fast multi-tenant queries
