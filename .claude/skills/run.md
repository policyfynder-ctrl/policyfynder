# Skill: run

Launch the PolicyFynder app and verify a change is working in the browser.

## When to Use

- User asks to "run the app", "start the server", "check if this works"
- After implementing a UI or API change that needs visual verification
- Before reporting a task as complete for any user-facing feature

## Steps

1. Check if a dev server is already running:

   ```bash
   lsof -i :3000 | grep LISTEN
   ```

2. If not running, start it:

   ```bash
   npm run dev
   ```

   Wait for "Ready" message before proceeding.

3. Use the Preview MCP or Chrome MCP to navigate to `http://localhost:3000`

4. Navigate to the relevant page and exercise the changed feature:
   - Golden path (happy path works)
   - One edge case (empty state, error state, boundary value)

5. Check the terminal for any server-side errors or warnings

6. Report what you saw — include what worked and any issues found

## Notes

- Dev server hot-reloads; no restart needed after code changes unless you modify `next.config.js` or env vars
- If port 3000 is in use by something else: `kill $(lsof -ti:3000)` then restart
- Database must be running for most features: `npm run dev` starts it via Docker Compose
