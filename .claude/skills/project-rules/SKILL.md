---
name: project-rules
description: >
  Mandatory pre-flight checklist for any coding, implementation, or architecture task in PolicyFynder.
  Use this skill at the START of every task — before writing code, creating files, or running searches.
  Trigger on any prompt that involves building, changing, adding, refactoring, debugging, or
  explaining PolicyFynder code. This is the first thing to consult, every time, without exception.
  If the user asks you to build a feature, fix a bug, add a component, update a route, write a
  migration, or touch any file in the project — load this skill first.
---

# PolicyFynder — Pre-Flight Rules

Before writing a single line of code, complete these four checks in order. They exist because
the worst time waste in this project is building something that already exists, or breaking
something because you didn't understand the architecture first.

---

## Rule 1: Read the Architecture Docs First

The architecture is documented. Read the relevant doc before designing a solution.

**What to read and when:**

| You're working on…                   | Read first                             |
| ------------------------------------ | -------------------------------------- |
| A new feature or entity              | `.claude/architecture/data-model.md`   |
| An API route or tRPC procedure       | `.claude/architecture/api.md`          |
| Auth, sessions, or permissions       | `.claude/architecture/auth.md`         |
| Anything structural or cross-cutting | `.claude/architecture/overview.md`     |
| A significant design decision        | `.claude/decisions/` (scan ADR titles) |

Don't rely on memory or inference about the stack — the docs are short and reading them takes
less than a minute. The cost of skipping them is building something inconsistent with decisions
already made.

**Minimum check:** Before any implementation task, read the one most relevant doc above.
Before any architectural change, read all of them plus the ADR log.

---

## Rule 2: Check for Existing Components Before Creating

The project has a component library. Before building a new component, check if one already exists.

**Where to look:**

```
src/components/ui/         # Primitive components (Button, Input, Modal, etc.)
src/components/features/   # Feature components (LeadCard, QuoteForm, etc.)
src/hooks/                 # Custom React hooks
src/utils/                 # Utility functions
src/lib/trpc/routers/      # tRPC procedures — check before writing a new one
```

**How to check (targeted, not a full scan):**

```bash
# Find a component by name
find src/components -name "*Button*" -o -name "*Form*" -o -name "*Modal*"

# Find a utility function
grep -r "formatCurrency\|formatDate\|truncate" src/utils/

# Find an existing tRPC procedure
grep -r "lead\.\|quote\.\|policy\." src/lib/trpc/routers/
```

If something similar exists: extend or compose it. Only create net-new when nothing close exists.
Duplicate components are how inconsistent UIs happen.

---

## Rule 3: Never Scan the Entire Repository

Full-repo scans (`find . -type f`, `grep -r "X" .`, `ls -R`) are banned except in the rarest
circumstances (e.g., a one-time migration script). They're slow, flood context with noise, and
almost never necessary.

**Instead, search precisely:**

```bash
# Bad — scans everything
grep -r "useState" .

# Good — scans only where hooks would be
grep -r "useState" src/components/ src/hooks/

# Bad — finds all files
find . -name "*.ts"

# Good — finds what you actually need
find src/lib/trpc/routers -name "*.ts"
```

**The rule of thumb:** If you don't already know roughly where the file is, read the architecture
overview first — it tells you where things live. Then search that specific directory.

---

## Rule 4: Check Available Skills Before Starting Work

The project has custom skills for common workflows. Using them ensures consistency and saves time.

**Available skills in `.claude/skills/`:**

| Skill        | What it covers                                                     |
| ------------ | ------------------------------------------------------------------ |
| `run.md`     | Starting the app and verifying changes in the browser              |
| `test.md`    | Running tests, writing tests, interpreting failures                |
| `db.md`      | Migrations, schema changes, seeding — read before any Prisma work  |
| `deploy.md`  | Pre-deploy checklist and deployment steps                          |
| `feature.md` | End-to-end feature implementation order and layer responsibilities |

**When to check:** At the start of any task that involves one of these areas. If you're about to
write a migration, open `db.md` first. If you're implementing a new feature, open `feature.md`.

---

## Quick Checklist

Copy this mentally before every task:

- [ ] Read the relevant architecture doc (`.claude/architecture/`)
- [ ] Checked for existing components/procedures before creating new ones
- [ ] Planned searches are targeted (specific paths, not whole repo)
- [ ] Checked if a skill exists for this type of task (`.claude/skills/`)

These aren't bureaucratic gates — they're the minimum due diligence that keeps the codebase
coherent as it grows.
