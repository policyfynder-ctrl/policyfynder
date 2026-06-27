import { cn } from '@/lib/utils'

// Consistent long-form typography for legal / content pages, using theme tokens.
export function Prose({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'mx-auto max-w-3xl px-4 py-14 text-sm leading-relaxed',
        '[&_h2]:font-heading [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold',
        '[&_p]:text-muted-foreground [&_p]:mb-4',
        '[&_ul]:text-muted-foreground [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
        '[&_a]:text-brand [&_a]:underline-offset-4 hover:[&_a]:underline',
        className
      )}
    >
      {children}
    </div>
  )
}
