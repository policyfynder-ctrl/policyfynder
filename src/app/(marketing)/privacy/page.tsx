import { PageHero } from '@/components/features/marketing/PageHero'
import { Prose } from '@/components/features/marketing/Prose'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How PolicyFynder collects, uses, and protects your personal information.',
}

// NOTE: Template content for launch. Have it reviewed by legal counsel and tailored
// to your jurisdiction (e.g. India DPDP Act) before going live.
export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" subtitle="Last updated: this is a template pending legal review." />
      <Prose>
        <h2>1. Introduction</h2>
        <p>
          PolicyFynder (“we”, “us”) is committed to protecting your privacy. This policy explains what
          information we collect, how we use it, and the choices you have. It applies to our website
          and the services we provide as an insurance intermediary.
        </p>

        <h2>2. Information we collect</h2>
        <ul>
          <li>Contact details you provide (name, email, phone) when you enquire or book a consultation.</li>
          <li>Information needed to advise on insurance (e.g. cover preferences and basic eligibility details).</li>
          <li>Usage data such as pages visited, collected to improve the website.</li>
        </ul>

        <h2>3. How we use your information</h2>
        <ul>
          <li>To respond to your enquiries and arrange consultations with a relationship manager.</li>
          <li>To help you compare, purchase, and manage insurance policies.</li>
          <li>To send service communications you have consented to, such as renewal reminders.</li>
        </ul>

        <h2>4. Sharing</h2>
        <p>
          We share information with insurers and service providers only as needed to provide our
          services, and as required by law. We do not sell your personal information.
        </p>

        <h2>5. Your choices</h2>
        <p>
          You can update your communication preferences or request access to and deletion of your data
          by contacting us at <a href="mailto:privacy@policyfynder.com">privacy@policyfynder.com</a>.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions about this policy? Email <a href="mailto:privacy@policyfynder.com">privacy@policyfynder.com</a>.
        </p>
      </Prose>
    </>
  )
}
