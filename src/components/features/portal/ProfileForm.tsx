'use client'

import { useActionState } from 'react'
import { updateProfileAction, type ProfileActionState } from '@/app/(dashboard)/profile/actions'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/features/auth/FormField'
import { FormError, FormSuccess } from '@/components/features/auth/FormBanner'

// Edit own name/phone. Email is read-only (managed via auth); the DB trigger also
// blocks any role/email change from a customer.
export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string
  phone: string
  email: string
}) {
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(updateProfileAction, undefined)

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <FormField label="Full name" name="full_name" type="text" defaultValue={fullName} />
      <FormField label="Phone" name="phone" type="tel" defaultValue={phone} />
      <FormField label="Email (read-only)" name="email_display" type="email" defaultValue={email} disabled />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
