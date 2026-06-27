'use client'

import { useActionState, useMemo, useState } from 'react'
import { queueMessageAction, type ComposeState } from '@/app/dashboard/communications/actions'
import { renderTemplateString, extractVariables } from '@/lib/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import type { ComposeTargetFull, TemplateRow } from '@/services/communications'

const ctrl =
  'border-border bg-background h-9 w-full rounded-lg border px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none'

const CHANNEL_LABEL: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS', in_app: 'In-app' }

// Queue-only compose: pick recipient policy → template (channels the recipient has
// NOT opted into are unavailable, with the reason shown) → fill variables → live
// preview → queue. The consent trigger is the server-side backstop.
export function ComposeForm({ targets, templates }: { targets: ComposeTargetFull[]; templates: TemplateRow[] }) {
  const [state, action, pending] = useActionState<ComposeState, FormData>(queueMessageAction, undefined)
  const [policyId, setPolicyId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [vars, setVars] = useState<Record<string, string>>({})

  const target = targets.find((t) => t.policy_id === policyId)
  const availableTemplates = useMemo(
    () => (target ? templates.filter((t) => target.allowedChannels.includes(t.channel)) : []),
    [target, templates]
  )
  const template = availableTemplates.find((t) => t.id === templateId)
  const fields = useMemo(
    () => (template ? [...new Set([...(template.required_variables ?? []), ...extractVariables(template.body)])] : []),
    [template]
  )

  if (targets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No policies with a linked customer account are available to message.
      </p>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />

      <label className="space-y-1.5 text-sm">
        <span className="font-medium">Recipient (policy)</span>
        <select
          name="policy_id"
          required
          value={policyId}
          onChange={(e) => { setPolicyId(e.target.value); setTemplateId(''); setVars({}) }}
          className={ctrl}
        >
          <option value="" disabled>Select a policy…</option>
          {targets.map((t) => (
            <option key={t.policy_id} value={t.policy_id}>
              {t.policy_number} — {t.holder_name}
            </option>
          ))}
        </select>
      </label>

      {target && target.blockedChannels.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Unavailable channels (no opt-in):{' '}
          {target.blockedChannels.map((c) => (
            <Badge key={c} variant="muted" className="ml-1">{CHANNEL_LABEL[c] ?? c}</Badge>
          ))}
        </p>
      )}

      {target && (
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Template</span>
          <select
            name="template_id"
            required
            value={templateId}
            onChange={(e) => { setTemplateId(e.target.value); setVars({}) }}
            className={ctrl}
          >
            <option value="" disabled>Select a template…</option>
            {availableTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {CHANNEL_LABEL[t.channel]} · {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {template && fields.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f} className="space-y-1 text-xs">
                <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                <input
                  name={`var_${f}`}
                  value={vars[f] ?? ''}
                  onChange={(e) => setVars((v) => ({ ...v, [f]: e.target.value }))}
                  className={ctrl}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {template && (
        <div className="border-border space-y-1 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs font-medium">
            Preview · {CHANNEL_LABEL[template.channel]}
          </p>
          {template.subject && (
            <p className="text-sm font-medium">{renderTemplateString(template.subject, vars)}</p>
          )}
          <p className="text-sm whitespace-pre-wrap">{renderTemplateString(template.body, vars)}</p>
        </div>
      )}

      <Button type="submit" disabled={pending || !template}>
        {pending ? 'Queuing…' : 'Queue message'}
      </Button>
    </form>
  )
}
