// Pure template helpers (no server imports) — used for live preview (M12) and,
// later, by the delivery worker (M13). Placeholders are {{snake_case}}.

const TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

/** Substitute {{vars}}; unknown placeholders are left visible so gaps are obvious. */
export function renderTemplateString(tpl: string | null | undefined, vars: Record<string, string>): string {
  if (!tpl) return ''
  return tpl.replace(TOKEN, (_, key: string) =>
    vars[key] != null && vars[key] !== '' ? vars[key] : `{{${key}}}`
  )
}

/** Distinct placeholder names referenced in a template string. */
export function extractVariables(tpl: string | null | undefined): string[] {
  if (!tpl) return []
  const out = new Set<string>()
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(tpl))) out.add(m[1])
  return [...out]
}

/** Required variables that are missing/blank in the supplied values. */
export function missingVariables(required: string[], vars: Record<string, string>): string[] {
  return required.filter((k) => !vars[k] || !vars[k].trim())
}
