import { createAdminClient } from '@/lib/supabase/admin'

// Contact-form submissions land as leads (source 'other', status 'new') so the
// sales team picks them up in the existing pipeline. The message is stored in
// leads.metadata (jsonb). Uses the admin client because anonymous visitors cannot
// insert leads under RLS — same pattern as the public booking write path. Only
// ever called from the /contact server action.

export type ContactInput = {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}

export type ContactResult = { ok: true } | { ok: false; error: string }

export async function submitContact(input: ContactInput): Promise<ContactResult> {
  const admin = createAdminClient()

  const [firstName, ...rest] = input.name.trim().split(/\s+/)
  const lastName = rest.join(' ') || '—'

  const { data: source } = await admin
    .from('lead_sources')
    .select('id')
    .eq('slug', 'other')
    .maybeSingle()

  const { error } = await admin.from('leads').insert({
    first_name: firstName,
    last_name: lastName,
    email: input.email,
    phone: input.phone?.trim() || '',
    source: 'other',
    source_id: source?.id ?? null,
    status: 'new',
    insurance_interest: [],
    metadata: {
      channel: 'website_contact',
      subject: input.subject ?? null,
      message: input.message,
    },
  })

  if (error) return { ok: false, error: 'Could not send your message. Please try again.' }
  return { ok: true }
}
