import { createClient } from '@/lib/supabase/server'

// Branches the current user can manage (for RM/team creation selects). Scoped to
// the user's accessible branches via the RBAC helper.
export async function listManageableBranches(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data: ids } = await supabase.rpc('get_accessible_branch_ids')
  const accessible: string[] = ids ?? []
  if (accessible.length === 0) return []
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .in('id', accessible)
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) return []
  return (data ?? []).map((b) => ({ id: b.id as string, name: b.name as string }))
}
