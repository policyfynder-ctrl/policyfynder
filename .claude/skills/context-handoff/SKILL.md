---
name: context-handoff
description: >
  Saves session progress and prepares a clean handoff for a fresh Claude Code session.
  Trigger this skill whenever: context usage is mentioned or appears high (60%, 70%, 80%+),
  the user says "save progress", "context is getting long", "start fresh", "context handoff",
  "running out of context", or "wrap up this session". Also trigger proactively when you notice
  the conversation has grown very long — many tool calls, large file reads, extensive back-and-forth.
  Never rely on long chat history to continue work. This skill makes MEMORY.md the source of truth
  so the next session can pick up exactly where this one left off.
---

# Context Handoff

Long conversations lose fidelity — earlier decisions get compressed, context about what was tried
and why gets dropped. The fix is to write down what matters before it's lost, not after.

When this skill triggers, you are the last checkpoint before the context resets. Your job is to
make the next session feel like it never left.

---

## Step 1: Assess What Happened This Session

Before writing anything, figure out what actually changed. Check:

```bash
# What files were modified or created this session?
git diff --name-only 2>/dev/null || find . \
  -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*" \
  -newer MEMORY.md -type f 2>/dev/null | sort
```

Then read the relevant files to understand what state they're in now. Don't summarize from memory — verify from files.

---

## Step 2: Update MEMORY.md

Read the current MEMORY.md, then update it to reflect the session's changes. Focus on:

**What to update:**

- The "What Is and Is Not Built" section — move completed items to Done ✓, add new not-done items
- Any architecture or schema decisions made this session
- The "Immediate Next Steps" list — reorder based on what's actually next
- Known assumptions if any were resolved or added

**What not to change:**

- Decisions that were already documented and haven't changed
- The folder structure section unless folders were added/removed

Keep MEMORY.md under ~200 lines. It's a quick-load document, not an exhaustive log.

---

## Step 3: Write the Session Summary Block

At the top of MEMORY.md (just below the metadata header), add or replace a `## Last Session` block:

```markdown
## Last Session

**Date:** [today's date]  
**What was built:** [1-3 bullet points — concrete things completed]  
**What was decided:** [1-2 bullet points — any new arch/product decisions]  
**Stopped at:** [one sentence — exactly where work paused]  
**Next action:** [one sentence — the first thing to do in the next session]
```

This block answers the first question any new session will have: "where did we leave off?"

---

## Step 4: Deliver the Fresh Session Starter

Give the user this exact message to copy-paste as the first message in a new session:

```
Read:
- CLAUDE.md
- MEMORY.md
- architecture/*
- decisions/*

Understand the project and wait for instructions.
```

Then on a new line, add the specific next action, e.g.:

```
Then: [the next concrete task — e.g., "Build the auth login page at src/app/(auth)/login/page.tsx"]
```

---

## What Makes a Good Handoff

A good handoff passes this test: a Claude session that has never seen this conversation can open
MEMORY.md, read it in 2 minutes, and start the next task with zero clarification questions.

Signs the handoff needs more work:

- "Next steps" list is vague (e.g., "finish the frontend" instead of "build LeadList component")
- A decision was made this session but isn't in MEMORY.md
- A file was modified but MEMORY.md still says it's empty/incomplete
- The "Stopped at" sentence refers to a conversation turn, not a file or feature

---

## Context Budget Rule

If you notice context is above 60% and no explicit handoff has been requested:

- Finish the current task cleanly (don't stop mid-file)
- Then proactively run this handoff without being asked
- Tell the user: "Context is getting long — I've updated MEMORY.md. Recommend starting a fresh session. Here's what to paste:"
