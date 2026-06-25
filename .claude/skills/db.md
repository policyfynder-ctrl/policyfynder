# Skill: db

Handle database migrations, schema changes, and seeding for PolicyFynder.

## When to Use

- Adding or modifying a Prisma model
- Running pending migrations in a new environment
- Resetting dev database to a clean state
- Debugging data issues

## Common Operations

### Apply pending migrations

```bash
npm run db:migrate
# or directly:
npx prisma migrate dev
```

### Create a new migration (after editing schema.prisma)

```bash
npx prisma migrate dev --name descriptive_migration_name
```

Name format: `snake_case`, describes what changed (e.g. `add_quote_status_field`, `create_carrier_table`).

### Reset dev database (destructive — dev only)

```bash
npm run db:reset
# Equivalent to: prisma migrate reset --force
```

### Seed with dev data

```bash
npm run db:seed
# or: npx ts-node prisma/seed.ts
```

### Open Prisma Studio (GUI browser for data)

```bash
npm run db:studio
```

### Generate Prisma client after schema changes

```bash
npx prisma generate
```

This runs automatically after `migrate dev` but run manually if you only pulled schema changes.

## Schema Change Checklist

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <name>` — review the generated SQL before proceeding
3. Run `npx prisma generate` if the client wasn't regenerated
4. Update seed file if new required fields were added
5. Update relevant Zod schemas in `src/lib/trpc/schemas/`
6. Run `npm run typecheck` to catch type mismatches

## Rules

- Never edit migration files after they've been committed
- Never write raw SQL for schema changes
- Always add `deletedAt DateTime?` to new core entity models (soft-delete pattern)
- Always add `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
