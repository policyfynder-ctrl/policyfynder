import { PageHero } from '@/components/features/marketing/PageHero'
import { Prose } from '@/components/features/marketing/Prose'

const EFFECTIVE_DATE = '30 June 2026'

export const metadata = {
  title: 'Terms of Service',
  description:
    'The terms governing your use of PolicyFynder’s website and services — an IRDAI-licensed insurance broker. Policies are issued by insurers; quotes and coverage are subject to insurer underwriting and terms.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service — PolicyFynder',
    description: 'The terms governing your use of the PolicyFynder website and services.',
    url: '/terms',
  },
}

export default function TermsPage() {
  return (
    <>
      <PageHero title="Terms of Service" subtitle={`Effective Date: ${EFFECTIVE_DATE}`} />
      <Prose>
        <h2>1. Acceptance of Terms</h2>
        <p>
          These Terms of Service (“Terms”) govern your access to and use of the PolicyFynder website at{' '}
          <a href="https://www.policyfynder.com">https://www.policyfynder.com</a> and the services we
          provide (collectively, the “Services”). By accessing or using the Services, you agree to be
          bound by these Terms and by our{' '}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, please do not use the Services.
        </p>

        <h2>2. About PolicyFynder</h2>
        <p>
          PolicyFynder is an insurance brokerage that helps individuals, families, and businesses find,
          compare, and manage insurance, supported by a dedicated relationship manager. PolicyFynder is
          an <strong>IRDAI-licensed insurance broker</strong> and arranges insurance on your behalf with
          insurers; it acts as an intermediary and not as an insurer.
        </p>

        <h2>3. Services Offered</h2>
        <p>
          We help you compare cover across insurers, obtain quotes, arrange policies, and provide ongoing
          support such as renewals and claims assistance across categories including health, motor, life,
          travel, commercial, and group insurance. The availability of particular products and insurers
          may change over time.
        </p>

        <h2>4. Insurance Broker Disclaimer</h2>
        <p>
          PolicyFynder acts solely as an insurance intermediary. Please note the following:
        </p>
        <ul>
          <li>
            <strong>Insurance policies are issued by the respective insurers, not by PolicyFynder.</strong>{' '}
            We do not underwrite or carry insurance risk.
          </li>
          <li>
            <strong>Quotes are indicative and subject to insurer underwriting</strong> and acceptance.
          </li>
          <li>
            <strong>Premiums may change</strong> based on the insurer’s assessment, the information you
            provide, regulatory changes, and other factors.
          </li>
          <li>
            <strong>Coverage is subject to the insurer’s terms, conditions, exclusions, and policy
            documents</strong>, which govern your policy in the event of any inconsistency with
            information presented on our website.
          </li>
        </ul>

        <h2>5. User Responsibilities</h2>
        <p>You agree to:</p>
        <ul>
          <li>Use the Services lawfully and only for legitimate purposes;</li>
          <li>Provide accurate, current, and complete information;</li>
          <li>Keep your account and login credentials secure and confidential;</li>
          <li>Not misuse, disrupt, or attempt to gain unauthorised access to the Services.</li>
        </ul>

        <h2>6. Accuracy of Information</h2>
        <p>
          The information you provide forms the basis of any quote, recommendation, or policy arranged for
          you. Inaccurate, incomplete, or misleading information may affect your quote, the validity of
          your cover, or the outcome of a claim. You are responsible for reviewing your policy documents
          and notifying us or the insurer of any errors or changes.
        </p>

        <h2>7. Quotes and Premiums</h2>
        <p>
          Quotes displayed or shared through the Services are indicative and provided for your
          convenience. Final terms, premiums, and acceptance are determined by the insurer based on its
          underwriting and the information provided. Premiums may change before issuance or at renewal.
          A policy is only in force once issued and accepted by the insurer and the applicable premium is
          paid.
        </p>

        <h2>8. Third-Party Insurers</h2>
        <p>
          Policies are provided by third-party insurers who are independently responsible for underwriting,
          issuing, servicing, and settling claims under their policies. Your relationship for the
          insurance contract is with the insurer, and that contract is governed by the insurer’s policy
          documents. We assist and advocate for you but are not a party to the insurance contract.
        </p>

        <h2>9. No Financial or Legal Advice</h2>
        <p>
          Information provided through the Services is general in nature and does not constitute financial,
          tax, or legal advice. While we help you understand and compare insurance options, you should
          consider your own circumstances and seek independent professional advice where appropriate before
          making decisions.
        </p>

        <h2>10. Intellectual Property</h2>
        <p>
          The Services, including the PolicyFynder name, logo, website design, text, graphics, and
          software, are owned by or licensed to PolicyFynder and are protected by intellectual-property
          laws. You may not copy, reproduce, modify, distribute, or create derivative works from any part
          of the Services without our prior written permission, except as permitted by law.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, PolicyFynder and its officers, employees, and agents
          shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or
          for any loss of profits, data, or goodwill, arising from or relating to your use of the Services
          or reliance on any general information provided. Nothing in these Terms excludes liability that
          cannot be excluded under applicable law.
        </p>

        <h2>12. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless PolicyFynder and its officers, employees, and agents
          from any claims, damages, liabilities, costs, and expenses (including reasonable legal fees)
          arising out of your breach of these Terms, your misuse of the Services, or your provision of
          inaccurate or unlawful information.
        </p>

        <h2>13. Privacy</h2>
        <p>
          Your use of the Services is also governed by our{' '}
          <a href="/privacy">Privacy Policy</a>, which explains how we collect, use, and protect your
          personal information. By using the Services, you consent to the practices described there.
        </p>

        <h2>14. Termination</h2>
        <p>
          We may suspend or terminate your access to the Services at any time, with or without notice, if
          you breach these Terms or if we reasonably consider it necessary to protect the Services, our
          users, or third parties. You may stop using the Services at any time. Provisions that by their
          nature should survive termination (including intellectual property, limitation of liability, and
          indemnification) will continue to apply.
        </p>

        <h2>15. Governing Law</h2>
        <p>
          These Terms and any dispute arising out of or in connection with them or the Services are
          governed by and construed in accordance with the laws of <strong>India</strong>, without regard
          to its conflict-of-laws principles.
        </p>

        <h2>16. Dispute Resolution</h2>
        <p>
          We encourage you to contact us first so we can try to resolve any concern informally. Any dispute
          that cannot be resolved amicably shall be subject to the exclusive jurisdiction of the competent
          courts in India. Nothing in these Terms limits any statutory rights you may have, including
          recourse to the insurer’s grievance-redressal mechanisms or the Insurance Ombudsman, where
          applicable.
        </p>

        <h2>17. Contact Information</h2>
        <p>If you have questions about these Terms, contact us:</p>
        <ul>
          <li>
            <strong>PolicyFynder</strong>
          </li>
          <li>
            Email: <a href="mailto:support@policyfynder.com">support@policyfynder.com</a>
          </li>
          <li>
            Website: <a href="https://www.policyfynder.com">https://www.policyfynder.com</a>
          </li>
        </ul>

        <h2>18. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time to reflect changes in our Services, legal
          requirements, or business practices. When we make material changes, we will update the
          “Effective Date” above and, where appropriate, notify you. Your continued use of the Services
          after an update constitutes acceptance of the revised Terms.
        </p>
      </Prose>
    </>
  )
}
