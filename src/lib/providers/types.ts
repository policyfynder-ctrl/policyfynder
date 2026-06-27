// Provider adapter contract (Milestone 13). Server-only — never import in client code.
// Adapters either send a message or report a failure the dispatcher can act on.
// `retryable` distinguishes transient faults (5xx/429/network → back off and retry)
// from permanent ones (bad template, invalid recipient → fail terminally now).

export type SendResult =
  | { ok: true; providerMessageId: string; dryRun: boolean; raw?: unknown }
  | { ok: false; retryable: boolean; error: string; raw?: unknown }

/**
 * Dry-run is the default this milestone — no real Graph/WhatsApp/SMS traffic.
 * A real send only happens when COMMUNICATIONS_DRY_RUN is explicitly 'false'.
 */
export function isDryRun(): boolean {
  return process.env.COMMUNICATIONS_DRY_RUN !== 'false'
}

/** Stable, obviously-fake id so dry-run rows are recognisable in delivery_logs. */
export function dryRunMessageId(channel: string): string {
  // No Math.random/Date.now constraints here (runtime code, not a workflow script),
  // but keep it readable: channel + timestamp + short random suffix.
  const suffix = Math.random().toString(36).slice(2, 10)
  return `dryrun-${channel}-${Date.now()}-${suffix}`
}
