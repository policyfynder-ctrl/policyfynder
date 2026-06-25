'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

// Submit button that reflects the enclosing form's pending state. Must be
// rendered inside a <form> so `useFormStatus` can read it.
type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingLabel?: string
}

export function SubmitButton({
  children,
  pendingLabel = 'Please wait…',
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
