import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { consentToggleAction, updatePreferencesAction } from '@/app/(dashboard)/profile/actions'
import type { Preferences } from '@/services/preferences'

const CHANNELS: { key: 'email' | 'whatsapp' | 'sms'; label: string; note?: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp', note: 'Requires explicit opt-in' },
  { key: 'sms', label: 'SMS', note: 'Requires explicit opt-in' },
]

// Customer-facing consent + channel preferences. Consent toggles write the consent
// ledger and the opt-in flag; preferred channel is a separate save. In-app messages
// are always on and not consent-gated.
export function CommunicationPreferences({ prefs }: { prefs: Preferences }) {
  const optIn = (k: 'email' | 'whatsapp' | 'sms') =>
    k === 'email' ? prefs.email_opt_in : k === 'whatsapp' ? prefs.whatsapp_opt_in : prefs.sms_opt_in

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication preferences</CardTitle>
        <CardDescription>Choose how we may contact you. In-app messages are always on.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="divide-border divide-y">
          {CHANNELS.map((c) => {
            const on = optIn(c.key)
            return (
              <li key={c.key} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <span className="font-medium">{c.label}</span>
                  {c.note && <span className="text-muted-foreground ml-2 text-xs">{c.note}</span>}
                  <div className="mt-0.5">
                    <Badge variant={on ? 'default' : 'muted'}>{on ? 'Opted in' : 'Not opted in'}</Badge>
                  </div>
                </div>
                <form action={consentToggleAction}>
                  <input type="hidden" name="channel" value={c.key} />
                  <input type="hidden" name="action" value={on ? 'revoked' : 'granted'} />
                  <button
                    type="submit"
                    className={buttonVariants({ size: 'sm', variant: 'outline' }) + ' h-7 px-2 text-xs'}
                  >
                    {on ? 'Opt out' : 'Opt in'}
                  </button>
                </form>
              </li>
            )
          })}
        </ul>

        <form action={updatePreferencesAction} className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs">
            <span className="font-medium">Preferred channel</span>
            <select
              name="preferred_channel"
              defaultValue={prefs.preferred_channel}
              className="border-border bg-background block h-9 rounded-lg border px-3 text-sm"
            >
              <option value="in_app">In-app</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="in_app_opt_in" defaultChecked={prefs.in_app_opt_in} />
            In-app notifications
          </label>
          <Button type="submit" size="sm" variant="secondary">
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
