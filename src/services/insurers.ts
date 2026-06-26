import { createClient } from '@/lib/supabase/server'

// Insurer (carrier) catalogue. Public-read via RLS (mirrors insurance_products).

export type InsurerRow = { id: string; name: string }

export async function listInsurers(): Promise<InsurerRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('insurers')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) return []
  return (data ?? []) as InsurerRow[]
}
