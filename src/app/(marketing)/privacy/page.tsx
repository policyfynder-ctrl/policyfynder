import { PageHero } from '@/components/features/marketing/PageHero'
import { Prose } from '@/components/features/marketing/Prose'

const EFFECTIVE_DATE = '30 June 2026'

export const metadata = {
  title: 'Privacy Policy',
  description:
    'How PolicyFynder collects, uses, protects, and shares your personal information — including our use of Meta, Google, analytics, and AI services, and your privacy rights.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy — PolicyFynder',
    description: 'How PolicyFynder collects, uses, and protects your personal information.',
    url: '/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" subtitle={`Effective Date: ${EFFECTIVE_DATE}`} />
      <Prose>
        <h2>1. Introduction</h2>
        <p>
          PolicyFynder (“PolicyFynder”, “we”, “us”, or “our”) respects your privacy and is committed
          to protecting the personal information you share with us. This Privacy Policy explains what
          information we collect, how we use it, when we share it, and the choices and rights you have.
          It applies to our website at{' '}
          <a href="https://www.policyfynder.com">https://www.policyfynder.com</a> and to the services
          we provide as an insurance intermediary.
        </p>
        <p>
          By using our website or services, you agree to the practices described in this policy. If you
          do not agree, please do not use the service.
        </p>

        <h2>2. Who We Are</h2>
        <p>
          PolicyFynder is an insurance brokerage that helps individuals, families, and businesses find,
          compare, and manage insurance, with a dedicated relationship manager supporting you from quote
          to claim. For the purposes of data-protection law, PolicyFynder is the controller of the
          personal information processed through our website and services.
        </p>

        <h2>3. Information We Collect</h2>
        <p>We collect information you provide and information generated when you use our services:</p>
        <ul>
          <li>
            <strong>Contact details</strong> — your name, email address, and phone number, provided when
            you enquire, book a consultation, or contact us.
          </li>
          <li>
            <strong>Insurance information</strong> — the cover you are interested in and basic details
            needed to advise on suitable policies (e.g. product type and eligibility information).
          </li>
          <li>
            <strong>Account information</strong> — if you create a customer account, your profile and the
            policies, appointments, and communications associated with you.
          </li>
          <li>
            <strong>Communication records</strong> — messages, consent records, and delivery history for
            the communications you receive from us.
          </li>
          <li>
            <strong>Usage and device data</strong> — pages visited, referring source, approximate
            location, and device/browser information, collected through cookies and similar technologies.
          </li>
        </ul>

        <h2>4. How We Use Your Information</h2>
        <p>
          We use your information <strong>only</strong> for the following purposes:
        </p>
        <ul>
          <li>Providing insurance quotations</li>
          <li>Policy servicing</li>
          <li>Claims assistance</li>
          <li>Customer support</li>
          <li>Marketing communication, only where you have given consent</li>
        </ul>
        <p>
          <strong>We never sell your personal information.</strong> We do not, and will not, sell, rent,
          or trade your personal information to third parties.
        </p>

        <h2>5. Cookies &amp; Tracking Technologies</h2>
        <p>
          We use cookies and similar technologies to keep the website working, remember your preferences,
          and understand how the site is used so we can improve it. You can control or disable cookies
          through your browser settings; some features may not function correctly without them. Where
          required, we ask for your consent before setting non-essential cookies.
        </p>

        <h2>6. Third-Party Services</h2>
        <p>
          We rely on trusted service providers to operate our website and deliver our services — for
          example, hosting, database and authentication providers, and communication providers used to
          send the messages you have consented to. These providers process information only as needed to
          provide their service to us and under appropriate safeguards. We also share information with
          insurers and partners strictly as necessary to arrange and service your insurance, and as
          required by law.
        </p>

        <h2>7. Meta (Facebook &amp; Instagram) API Usage</h2>
        <p>
          PolicyFynder may use Meta Platforms’ products and APIs to manage advertising, respond to
          enquiries, and communicate with customers who reach us through Meta channels. Specifically, we
          may use:
        </p>
        <ul>
          <li>
            <strong>Meta Graph API</strong> — to receive and respond to enquiries and manage business
            messaging and page interactions.
          </li>
          <li>
            <strong>Instagram Business API</strong> — to manage and respond to interactions from our
            Instagram business presence.
          </li>
          <li>
            <strong>Facebook Marketing API</strong> — to manage and measure advertising campaigns.
          </li>
        </ul>
        <p>
          Where we use these services, information is handled in accordance with Meta’s platform terms
          and policies in addition to this Privacy Policy. We only access the data necessary for these
          purposes and do not use it to sell your information.
        </p>

        <h2>8. Google Services</h2>
        <p>PolicyFynder may use Google services, including:</p>
        <ul>
          <li>
            <strong>Google Analytics</strong> — to understand website traffic and usage (see “Analytics”
            below).
          </li>
          <li>
            <strong>Google OAuth (planned / future)</strong> — to offer secure sign-in using your Google
            account. If and when enabled, we would access only the basic profile information needed to
            authenticate you, in line with Google’s API Services User Data Policy, including its Limited
            Use requirements.
          </li>
        </ul>

        <h2>9. Analytics</h2>
        <p>
          We use analytics tools, such as Google Analytics, to collect aggregated, mostly de-identified
          information about how visitors use our website (for example, pages viewed and general location).
          This helps us improve content and performance. Analytics providers may set their own cookies;
          you can opt out through your browser or the provider’s opt-out tools.
        </p>

        <h2>10. AI Services</h2>
        <p>
          Where applicable, PolicyFynder may use artificial-intelligence services — including{' '}
          <strong>OpenAI</strong> and <strong>Anthropic</strong> — to help draft communications, answer
          queries, summarise information, and improve customer support. When AI services are used, we aim
          to minimise the personal information shared with them, use them under their business terms
          (which restrict using your data to train their models), and never use them to sell your
          information.
        </p>

        <h2>11. Data Security</h2>
        <p>
          We take the security of your information seriously and apply appropriate technical and
          organisational measures — including encryption in transit, access controls, row-level security
          on our database, and the principle of least privilege — to protect against unauthorised access,
          loss, or misuse. No method of transmission or storage is completely secure, but we work
          continuously to safeguard your data.
        </p>

        <h2>12. Data Retention</h2>
        <p>
          We keep your personal information only for as long as necessary to provide our services, comply
          with legal and regulatory obligations (including insurance and tax requirements), resolve
          disputes, and enforce our agreements. When information is no longer needed, we delete or
          anonymise it.
        </p>

        <h2>13. User Rights</h2>
        <p>
          Subject to applicable law, you have the right to access the personal information we hold about
          you, request correction or deletion, object to or restrict certain processing, withdraw consent
          (for example, to marketing), and request a copy of your data. To exercise any of these rights,
          contact us using the details below. You can also update your communication preferences at any
          time from your account or by contacting us.
        </p>

        <h2>14. Children’s Privacy</h2>
        <p>
          Our services are intended for adults and are not directed to children. We do not knowingly
          collect personal information from children. If you believe a child has provided us with
          personal information, please contact us and we will take appropriate steps to delete it.
        </p>

        <h2>15. Contact Information</h2>
        <p>
          If you have questions about this Privacy Policy or how we handle your information, contact us:
        </p>
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

        <h2>16. Updates to this Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our services, legal
          requirements, or best practices. When we make material changes, we will update the “Effective
          Date” above and, where appropriate, notify you. We encourage you to review this page
          periodically. Your continued use of our services after an update means you accept the revised
          policy.
        </p>
      </Prose>
    </>
  )
}
