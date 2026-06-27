import { PageHero } from '@/components/features/marketing/PageHero'
import { Prose } from '@/components/features/marketing/Prose'

export const metadata = {
  title: 'Terms & Conditions',
  description: 'The terms governing your use of the PolicyFynder website and services.',
}

// NOTE: Template content for launch. Have it reviewed by legal counsel before going live.
export default function TermsPage() {
  return (
    <>
      <PageHero title="Terms & Conditions" subtitle="Last updated: this is a template pending legal review." />
      <Prose>
        <h2>1. Acceptance of terms</h2>
        <p>
          By accessing or using the PolicyFynder website and services, you agree to these Terms &amp;
          Conditions. If you do not agree, please do not use the service.
        </p>

        <h2>2. Our service</h2>
        <p>
          PolicyFynder acts as an insurance intermediary, helping you compare and arrange insurance
          cover. We are not the insurer; policies are issued by the respective insurance companies and
          governed by their policy documents.
        </p>

        <h2>3. No guarantee of cover</h2>
        <p>
          Quotes and recommendations are indicative. The final terms, premium, and acceptance of any
          policy are determined by the insurer based on the information you provide.
        </p>

        <h2>4. Your responsibilities</h2>
        <ul>
          <li>Provide accurate and complete information.</li>
          <li>Review policy documents before purchase.</li>
          <li>Keep your contact and login details secure.</li>
        </ul>

        <h2>5. Limitation of liability</h2>
        <p>
          To the extent permitted by law, PolicyFynder is not liable for indirect or consequential
          losses arising from use of the website or reliance on general information provided.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions about these terms? Email <a href="mailto:hello@policyfynder.com">hello@policyfynder.com</a>.
        </p>
      </Prose>
    </>
  )
}
