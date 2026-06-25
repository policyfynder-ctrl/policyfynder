# Skill: test

Run tests for the PolicyFynder codebase and interpret results.

## When to Use

- After making code changes — always run relevant tests before declaring done
- User asks to "run tests", "check tests pass", "write tests for X"
- Before creating a PR

## Commands

### Run all tests

```bash
npm test
```

### Run tests for a specific file or directory

```bash
npm test -- src/lib/trpc/routers/leads.test.ts
npm test -- src/components/features/QuoteForm
```

### Watch mode (for active development)

```bash
npm run test:watch
```

### End-to-end tests (requires running server)

```bash
npm run test:e2e
```

### Type check only (fast, no test runner)

```bash
npm run typecheck
```

## Interpreting Results

**All green** — report passing count, note any skipped tests and why they were skipped.

**Failures** — read the error carefully:

- `Cannot find module` → missing import or wrong path
- `Type error` → run `npm run typecheck` for the full TS error
- `Expected X received Y` → logic bug; read the test assertion to understand intent
- Database errors in unit tests → test is incorrectly hitting the DB; should be mocked

## Writing Tests

- Co-locate test files: `MyComponent.test.tsx` next to `MyComponent.tsx`
- Unit tests: pure functions and tRPC procedures
- Use `vi.mock()` for external dependencies (Prisma, email, storage)
- Do NOT mock the database in integration tests — use a test DB
- Test file structure:
  ```ts
  describe('featureName', () => {
    it('does the thing when condition', () => { ... })
    it('handles the edge case', () => { ... })
  })
  ```
