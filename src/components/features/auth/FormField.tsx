import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// A labelled input with inline validation error. `labelAccessory` renders on the
// right of the label row (e.g. a "Forgot password?" link).
type FormFieldProps = React.ComponentProps<'input'> & {
  label: string
  name: string
  error?: string
  labelAccessory?: React.ReactNode
}

export function FormField({ label, name, error, labelAccessory, ...inputProps }: FormFieldProps) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={name}>{label}</Label>
        {labelAccessory}
      </div>
      <Input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
