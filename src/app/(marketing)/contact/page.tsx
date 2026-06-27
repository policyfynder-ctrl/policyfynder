import { Mail, Phone, MapPin } from 'lucide-react'
import { PageHero } from '@/components/features/marketing/PageHero'
import { ContactForm } from '@/components/features/marketing/ContactForm'

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with PolicyFynder — we’re here to help with quotes, policies, and claims.',
}

export default function ContactPage() {
  return (
    <>
      <PageHero title="Contact us" subtitle="Have a question? Send us a message and a relationship manager will get back to you." />
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <span className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg">
              <Mail className="size-5" />
            </span>
            <div>
              <h2 className="font-medium">Email</h2>
              <a href="mailto:hello@policyfynder.com" className="text-muted-foreground hover:text-foreground text-sm">
                hello@policyfynder.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg">
              <Phone className="size-5" />
            </span>
            <div>
              <h2 className="font-medium">Phone</h2>
              <p className="text-muted-foreground text-sm">+91 1800-000-000 (Mon–Sat, 9am–7pm)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-lg">
              <MapPin className="size-5" />
            </span>
            <div>
              <h2 className="font-medium">Prefer to talk in person?</h2>
              <p className="text-muted-foreground text-sm">Prefer to talk? Book a free consultation and we’ll match you with a relationship manager.</p>
            </div>
          </div>
        </div>
        <div className="border-border bg-card rounded-xl border p-6 shadow-sm sm:p-8">
          <ContactForm />
        </div>
      </section>
    </>
  )
}
