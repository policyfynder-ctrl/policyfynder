import { createClient } from '@/lib/supabase/server'

// Insurance product catalogue. Public-read via RLS.

export type ProductRow = { id: string; name: string }

export async function listProducts(): Promise<ProductRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('insurance_products')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) return []
  return (data ?? []) as ProductRow[]
}
