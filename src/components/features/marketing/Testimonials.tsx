import { Star } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Social proof. Illustrative testimonials for the launch site (replace with real
// reviews when available). Static content — no PII, no DB.
const testimonials = [
  {
    name: 'Ananya R.',
    role: 'Health policyholder',
    quote:
      'My RM compared four health plans for me and explained the waiting periods clearly. I finally understood what I was buying.',
  },
  {
    name: 'Vikram S.',
    role: 'Small business owner',
    quote:
      'They set up shop insurance and group health for my team in a week, and handled a claim end to end. Genuinely helpful.',
  },
  {
    name: 'Meera & Karthik',
    role: 'Motor + travel cover',
    quote:
      'Renewals used to slip my mind every year. Now I get a reminder and it’s sorted in minutes. Worth it for the peace of mind.',
  },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Testimonials() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {testimonials.map((t) => (
        <figure key={t.name} className="border-border bg-card flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
          <div className="text-brand flex gap-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
          </div>
          <blockquote className="text-foreground flex-1 text-sm leading-relaxed">“{t.quote}”</blockquote>
          <figcaption className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials(t.name)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">{t.name}</div>
              <div className="text-muted-foreground">{t.role}</div>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
