# PolicyFynder — Project Guide

PolicyFynder is an insurance CRM that helps agents find, compare, and manage policies for their clients.

---

## Tech Stack

| What               | Tool                    | Why                                                   |
| ------------------ | ----------------------- | ----------------------------------------------------- |
| Frontend framework | Next.js 14 (App Router) | Pages, routing, and server logic in one place         |
| Database + Auth    | Supabase                | Postgres database with built-in auth and file storage |
| UI Components      | ShadCN UI               | Accessible, unstyled components built on Radix UI     |
| Styling            | Tailwind CSS            | Fast, consistent styling with utility classes         |
| Language           | TypeScript              | Catches type errors before they become runtime bugs   |
| Deployment         | Vercel                  | One-click deploys connected to GitHub                 |

---

## Commands

```bash
# Start development
npm run dev

# Check for type errors
npm run typecheck

# Run tests
npm test

# Format code
npm run format

# Lint
npm run lint
```

---

## Folder Structure

```
src/
  app/              # Pages and layouts (Next.js App Router)
    (auth)/         # Login, signup pages
    (dashboard)/    # Main app pages (protected)
    api/            # Server-side API routes
  components/
    ui/             # ShadCN UI primitives (Button, Input, Badge, etc.)
    features/       # Feature-specific components (LeadCard, QuoteForm, etc.)
    layout/         # Shell components (Sidebar, Header, Nav)
  lib/
    supabase/       # Supabase client setup (browser + server)
    utils.ts        # cn() helper and shared utilities
  hooks/            # Custom React hooks (useLeads, useQuotes, etc.)
  types/            # TypeScript type definitions
  services/         # Data access layer — all Supabase queries live here
supabase/
  migrations/       # Database migration SQL files
  functions/        # Supabase Edge Functions
  seed.sql          # Sample data for development
public/             # Static assets (images, icons, fonts)
architecture/       # System design documentation
decisions/          # Key product and technical choices
.claude/            # Claude Code project configuration
```

---

## Core Concepts

**Lead** — A potential customer. Goes through stages: `new → contacted → quoted → bound → lost`

**Quote** — A price estimate from an insurance carrier for a lead.

**Policy** — A confirmed, active insurance policy (quote that was accepted).

**Carrier** — An insurance company (e.g. State Farm, Allstate).

**Agent** — A PolicyFynder user managing leads and quotes.

---

## Coding Rules

1. Read `architecture/` docs before starting any feature
2. Check for existing components in `src/components/` before creating new ones
3. Never run searches on the entire project — target specific folders
4. Follow the skill guides in `.claude/skills/` for common tasks
5. All database queries go through `src/services/` — never query Supabase directly in components
6. Never expose Supabase service keys to the browser
7. Every page inside `(dashboard)/` is automatically protected by the layout auth check
8. When context exceeds ~60%, run the `context-handoff` skill — update MEMORY.md and recommend a fresh session

---

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Get these from your Supabase project dashboard → Settings → API.

---

## Pre-Flight Checklist

Before writing code, always:

- [ ] Read the relevant `architecture/` doc
- [ ] Check if a component already exists in `src/components/`
- [ ] Check `src/services/` for an existing data query
- [ ] Check `.claude/skills/` for a relevant workflow guide

---

## Documentation

- [System Design](architecture/system-design.md) — How all the pieces connect
- [Database Schema](architecture/database-schema.md) — Tables, relationships, security rules
- [Frontend Structure](architecture/frontend-structure.md) — Pages, components, routing
- [Backend Structure](architecture/backend-structure.md) — API routes, server functions
- [Product Decisions](decisions/product-decisions.md) — Why we built it this way
