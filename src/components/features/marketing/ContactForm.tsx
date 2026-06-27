'use client'

import { useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/features/auth/SubmitButton'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'
import { contactAction, type ContactState } from '@/app/(marketing)/contact/actions'

export function ContactForm() {
  const [state, formAction] = useActionState<ContactState, FormData>(contactAction, undefined)

  if (state?.success) {
    return (
      <FormSuccess message="Thanks for reaching out — a relationship manager will be in touch shortly." />
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject (optional)</Label>
          <Input id="subject" name="subject" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="border-border bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
        />
      </div>
      <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  )
}
