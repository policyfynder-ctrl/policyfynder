# Communication Providers (Milestone 13)

PolicyFynder delivers queued communications through a **Vercel-Cron-driven
dispatcher** that reads the `notifications` queue and sends each message via the
right channel adapter. This document covers how the pipeline works and how to wire
up the real Microsoft Graph (email) and WhatsApp Business Cloud API (Meta) providers
when you are ready to go live.

> **Default is dry-run.** Out of the box `COMMUNICATIONS_DRY_RUN` is `true` (or unset),
> so the dispatcher simulates every send — it advances rows to `status='sent'` with a
> `dryrun-*` provider id and writes `delivery_logs`, but **no real customer message is
> sent**. Real delivery only happens when you set `COMMUNICATIONS_DRY_RUN=false` *and*
> provide the credentials below.

---

## How the pipeline works

```
compose (staff UI)  ──▶  notifications (status=pending)        [M12 queue + consent]
                              │
        Vercel Cron (*/2m) ──▶ POST /api/cron/dispatch         [CRON_SECRET auth]
                              │
                     runDispatchCycle()  (service role)        [src/services/dispatch.ts]
                              │  claim_due_notifications()  ── FOR UPDATE SKIP LOCKED
                              │  re-validate vars + LIVE consent
                              │  render template (subject/body)
                              ├─▶ Graph sendMail  (email)       [src/lib/providers/graph.ts]
                              └─▶ WhatsApp /messages (template) [src/lib/providers/whatsapp.ts]
                              │
                     status=sent + provider_message_id + delivery_logs
                              │
   Meta status webhook ──▶ POST /api/webhooks/whatsapp          [HMAC-verified]
                              │  forward-only: sent → delivered → read / failed
                     notifications.status update → timeline (activity_logs) for free
```

Key design points:

- **Safe concurrency.** `claim_due_notifications(p_limit)` (migration 027) atomically
  claims due rows with `FOR UPDATE SKIP LOCKED` and stamps `claimed_at`. Overlapping
  cron runs never double-send. A claim older than 15 minutes is treated as abandoned
  (crashed worker) and becomes claimable again.
- **Retries.** On a transient failure the dispatcher increments `retry_count`, sets
  `next_retry_at` with exponential backoff (2m → 4m → 8m), and clears `claimed_at` so
  the row is re-claimed after the window. Permanent failures (bad template, revoked
  consent, invalid recipient) fail terminally with retries exhausted.
- **Consent at send time.** Consent is enforced at queue time by the M12 trigger and
  **re-checked at send time** — a customer who opts out between queueing and dispatch
  is not messaged.
- **Email semantics.** Microsoft Graph confirms acceptance (HTTP 202), not delivery.
  Email is therefore terminal at `status='sent'`; `delivered`/`read` apply to WhatsApp
  only.
- **Timeline is automatic.** Any `notifications.status` change fires the M12
  `trigger_log_communication` → `activity_logs`, so the customer/RM policy timeline
  reflects delivery without extra code.

---

## Environment variables

See `.env.local.example`. Summary:

| Var | Purpose |
| --- | --- |
| `COMMUNICATIONS_DRY_RUN` | `true`/unset = simulate; `false` = real sends |
| `CRON_SECRET` | Bearer token Vercel Cron presents to `/api/cron/dispatch` |
| `GRAPH_TENANT_ID` / `GRAPH_CLIENT_ID` / `GRAPH_CLIENT_SECRET` / `GRAPH_SENDER` | Microsoft Graph email |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_APP_SECRET` / `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_API_VERSION` | WhatsApp Cloud API |

All provider secrets are **server-only** — never prefixed `NEXT_PUBLIC_`.

---

## Microsoft Graph (email) setup

1. **Azure Portal → App registrations → New registration.** Note the
   **Directory (tenant) ID** → `GRAPH_TENANT_ID` and **Application (client) ID** →
   `GRAPH_CLIENT_ID`.
2. **Certificates & secrets → New client secret** → `GRAPH_CLIENT_SECRET`.
3. **API permissions → Microsoft Graph → Application permissions → `Mail.Send`** →
   then **Grant admin consent**.
4. Pick the sending mailbox (a shared mailbox such as `noreply@yourdomain.com`) →
   `GRAPH_SENDER`. Optionally restrict the app to just that mailbox with an
   [Application Access Policy](https://learn.microsoft.com/graph/auth-limit-mailbox-access).
5. Set `COMMUNICATIONS_DRY_RUN=false` to enable real sends.

The adapter uses the client-credentials grant and `POST /users/{sender}/sendMail`.
A `202` response marks the message `sent`.

---

## WhatsApp Business Cloud API (Meta) setup

1. **Meta for Developers → create an app → add WhatsApp.** From WhatsApp → API Setup,
   note the **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID` and a **permanent access
   token** (System User token recommended) → `WHATSAPP_ACCESS_TOKEN`.
2. **App settings → Basic → App Secret** → `WHATSAPP_APP_SECRET` (used to verify
   webhook signatures).
3. Choose any string for `WHATSAPP_VERIFY_TOKEN` (used during webhook verification).
4. **Create message templates** in the WhatsApp Manager and get them approved. Store
   each approved template's name in `notification_templates.external_template_id` for
   the matching `whatsapp` template row. Outside the 24-hour customer window only
   approved templates may be sent.
5. **Configure the webhook:** in the app's WhatsApp → Configuration, set the callback
   URL to `https://<your-domain>/api/webhooks/whatsapp` and the verify token to
   `WHATSAPP_VERIFY_TOKEN`; subscribe to the **messages** field. Meta will GET the URL
   to verify, then POST status updates which the route HMAC-verifies and applies.

---

## Scheduling (Vercel Cron)

`vercel.json` registers `/api/cron/dispatch` on `*/2 * * * *` (every 2 minutes).
Vercel automatically sends `Authorization: Bearer $CRON_SECRET`. Note the 2-minute
cadence requires a Vercel plan that allows sub-daily crons; the Hobby plan runs crons
at most daily.

You can also trigger a cycle manually:

```bash
curl -X POST https://<domain>/api/cron/dispatch \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Local testing (dry-run)

With the local Supabase stack running and `COMMUNICATIONS_DRY_RUN=true`:

```bash
# queue a message via the UI, then drive the dispatcher:
curl -X POST "http://localhost:3000/api/cron/dispatch" \
  -H "Authorization: Bearer $CRON_SECRET"
# → { ok: true, claimed: N, sent: N, failed: 0, skipped: 0, dryRun: true }
```

Rows move `pending → sent` with a `dryrun-*` provider id; the queue UI shows the
delivery_logs trail. No external API is contacted.
