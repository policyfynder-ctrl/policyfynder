import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { completeTaskAction } from '@/app/dashboard/tasks/actions'
import type { TaskRow } from '@/services/tasks'

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Server component: RM task queue. Open tasks show a "Complete" action
// (progressive-enhancement form → server action; RLS enforces permission).
export function TaskList({ tasks }: { tasks: TaskRow[] }) {
  if (tasks.length === 0) {
    return (
      <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-4 py-10 text-center text-sm">
        No tasks here.
      </p>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th className="px-4 py-2 font-medium">Task</th>
            <th className="px-4 py-2 font-medium">Kind</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Due</th>
            <th className="hidden px-4 py-2 font-medium md:table-cell">Linked to</th>
            <th className="hidden px-4 py-2 font-medium lg:table-cell">RM</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-border hover:bg-muted/30 border-t">
              <td className="px-4 py-2.5">
                <div className="font-medium">{t.title}</div>
                {t.note && <div className="text-muted-foreground text-xs">{t.note}</div>}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={t.kind === 'renewal' ? 'secondary' : 'outline'}>{t.kind}</Badge>
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 sm:table-cell">{fmt(t.due_at)}</td>
              <td className="hidden px-4 py-2.5 md:table-cell">
                {t.entity_type === 'policy' && t.entity_id ? (
                  <Link href={`/dashboard/policies/${t.entity_id}`} className="hover:underline">
                    {t.entity_label ?? 'Policy'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{t.entity_type}</span>
                )}
              </td>
              <td className="text-muted-foreground hidden px-4 py-2.5 lg:table-cell">
                {t.assigned_rm?.full_name ?? '—'}
              </td>
              <td className="px-4 py-2.5">
                {t.completed_at ? (
                  <Badge variant="muted">Completed</Badge>
                ) : (
                  <form action={completeTaskAction}>
                    <input type="hidden" name="task_id" value={t.id} />
                    <button
                      type="submit"
                      className={buttonVariants({ size: 'sm', variant: 'outline' }) + ' h-7 px-2 text-xs'}
                    >
                      Complete
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
