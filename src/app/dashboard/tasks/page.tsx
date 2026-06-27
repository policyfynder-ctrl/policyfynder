import Link from 'next/link'
import { redirect } from 'next/navigation'
import { listTasks } from '@/services/tasks'
import { getCurrentViewer } from '@/services/roles'
import { TaskList } from '@/components/features/tasks/TaskList'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Tasks — PolicyFynder' }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const viewer = await getCurrentViewer()
  const perms = viewer?.permissions ?? []
  if (!perms.some((p) => p.startsWith('tasks.view_'))) redirect('/dashboard')

  const { status } = await searchParams
  const active = status === 'completed' ? 'completed' : 'open'
  const tasks = await listTasks({ status: active })

  const chip = (value: 'open' | 'completed', label: string) => (
    <Link
      href={`/dashboard/tasks?status=${value}`}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active === value
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
    </Link>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground text-sm">
          {tasks.length} {active} task{tasks.length === 1 ? '' : 's'} in your view.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip('open', 'Open')}
        {chip('completed', 'Completed')}
      </div>

      <TaskList tasks={tasks} />
    </div>
  )
}
