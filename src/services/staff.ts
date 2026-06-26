import { createClient } from '@/lib/supabase/server'

// Resolves RM display names via the least-privilege v_staff_directory view
// (migration 019). The view exposes ONLY rm_id + full_name and is scoped to the
// caller's accessible RMs, so this never leaks email/phone and never widens the
// caller's existing data scope. Use this instead of embedding profile:profiles
// in RM/team/lead/appointment reads — the profiles table is self+admin only, so
// those embeds return blanks for managers.

type StaffEntry = { rm_id: string; full_name: string | null }

/**
 * Map of rm_id → full_name for the given RM ids, scoped by the view. RM ids the
 * caller can't see (or without a name) are simply absent from the map. Returns an
 * empty map on error or empty input — name display is non-critical and must never
 * break a page.
 */
export async function staffNameMap(
  rmIds: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const ids = [...new Set(rmIds.filter((x): x is string => Boolean(x)))]
  if (ids.length === 0) return new Map()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_staff_directory')
    .select('rm_id, full_name')
    .in('rm_id', ids)
  if (error) return new Map()

  const map = new Map<string, string>()
  for (const row of (data ?? []) as StaffEntry[]) {
    if (row.full_name) map.set(row.rm_id, row.full_name)
  }
  return map
}
