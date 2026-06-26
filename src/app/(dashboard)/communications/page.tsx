import { redirect } from 'next/navigation'
import { getCurrentViewer } from '@/services/roles'
import { listComposeTargets, listTemplates, listMessages } from '@/services/communications'
import { ComposeForm } from '@/components/features/communications/ComposeForm'
import { MessageQueueList } from '@/components/features/communications/MessageQueueList'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Communications — PolicyFynder' }

export default async function CommunicationsPage() {
  const viewer = await getCurrentViewer()
  const perms = viewer?.permissions ?? []
  const canSend = perms.includes('communications.send')
  const canView = perms.some((p) => p.startsWith('communications.view_'))
  if (!canSend && !canView) redirect('/dashboard')

  const [targets, templates, messages] = await Promise.all([
    canSend ? listComposeTargets() : Promise.resolve([]),
    canSend ? listTemplates() : Promise.resolve([]),
    canView ? listMessages() : Promise.resolve([]),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Communications</h1>
        <p className="text-muted-foreground text-sm">
          Compose and queue messages. Queue-only — delivery is handled separately.
        </p>
      </div>

      {canSend && (
        <Card>
          <CardHeader>
            <CardTitle>Compose</CardTitle>
            <CardDescription>
              Channels the customer hasn&apos;t opted into are unavailable. Nothing is sent yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ComposeForm targets={targets} templates={templates} />
          </CardContent>
        </Card>
      )}

      {canView && (
        <Card>
          <CardHeader>
            <CardTitle>Message queue</CardTitle>
          </CardHeader>
          <CardContent>
            <MessageQueueList messages={messages} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
