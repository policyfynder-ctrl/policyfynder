# Key Rotation (manual)

Rotate secrets before launch and on any suspected exposure. **All steps are manual** —
nothing here is automated. After each rotation, update every place the secret is used,
then run `npm run production:check`.

> ⚠️ Outstanding: the cloud `service_role` key and DB password were exposed in chat
> earlier in development. Rotate both before going live.

## Supabase service_role key

1. Supabase dashboard → Settings → API → **Roll** the `service_role` key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in: Vercel (Production env), local `.env.local`.
3. Redeploy (or restart) so servers pick up the new key.
4. Verify: an admin API route still works (e.g. RM management); `production:check` passes.

> The **anon** key can also be rolled; if so, update `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> everywhere and redeploy (it is embedded in the client bundle at build time).

## Database password

1. Supabase dashboard → Settings → Database → **Reset database password**.
2. Update any direct `--db-url` connection strings you use for migrations (URL-encode
   special characters: `@`→`%40`, `#`→`%23`, `%`→`%25`).
3. This does not affect the app (it uses the API keys, not the DB password).

## CRON_SECRET

1. Generate a new random value (e.g. `openssl rand -hex 32`).
2. Update `CRON_SECRET` in Vercel; the Vercel Cron job sends it automatically.
3. Verify `/api/cron/dispatch` returns 401 without it and runs with it.

## Provider secrets (only when live sending)

- **Microsoft Graph:** rotate the client secret in Azure → App registrations →
  Certificates & secrets; update `GRAPH_CLIENT_SECRET`.
- **WhatsApp Cloud API:** regenerate the access token / app secret in Meta; update
  `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_APP_SECRET` (and re-verify the webhook).

## After any rotation

- [ ] Old secret invalidated.
- [ ] New secret set in Vercel + local + any CI.
- [ ] Redeployed.
- [ ] `npm run production:check` → 0 failures.
