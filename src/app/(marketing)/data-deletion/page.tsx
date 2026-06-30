import { PageHero } from '@/components/features/marketing/PageHero'
import { Prose } from '@/components/features/marketing/Prose'

const EFFECTIVE_DATE = '30 June 2026'

export const metadata = {
  title: 'Data Deletion',
  description:
    'How to request deletion of your personal data from PolicyFynder, including data associated with Facebook or Instagram, what is deleted, what may be retained, and the timeline.',
  alternates: { canonical: '/data-deletion' },
  openGraph: {
    title: 'Data Deletion — PolicyFynder',
    description: 'How to request deletion of your personal data from PolicyFynder.',
    url: '/data-deletion',
  },
}

export default function DataDeletionPage() {
  return (
    <>
      <PageHero title="Data Deletion" subtitle={`Effective Date: ${EFFECTIVE_DATE}`} />
      <Prose>
        <h2>1. Introduction</h2>
        <p>
          At PolicyFynder, you are in control of your personal information. This page explains how to
          request the deletion of the personal data we hold about you, what will be deleted, what we may
          be required to retain, and how long the process takes. It supplements our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>2. How to Request Data Deletion</h2>
        <p>You can request deletion of your personal data in either of these ways:</p>
        <ul>
          <li>
            <strong>Email us</strong> at{' '}
            <a href="mailto:support@policyfynder.com">support@policyfynder.com</a> with the subject line
            “Data Deletion Request”, from the email address associated with your account.
          </li>
          <li>
            <strong>Contact your relationship manager</strong> or use the{' '}
            <a href="/contact">Contact</a> page, and let us know you would like your data deleted.
          </li>
        </ul>
        <p>
          To protect your information, we may need to verify your identity before processing a deletion
          request.
        </p>

        <h2>3. Requesting Deletion via Facebook or Instagram (Meta)</h2>
        <p>
          If you interacted with PolicyFynder through Facebook or Instagram, you can request that we
          delete the data associated with that interaction. To do so, email{' '}
          <a href="mailto:support@policyfynder.com">support@policyfynder.com</a> with the subject
          “Facebook/Instagram Data Deletion” and include the account or message details you used to reach
          us. You may also remove PolicyFynder’s access from your Facebook or Instagram settings at any
          time. Upon a valid request, we will delete the personal data we hold from that Meta interaction,
          subject to the retention exceptions below.
        </p>

        <h2>4. What Data Will Be Deleted</h2>
        <p>On a verified request, we will delete personal data we hold about you, which may include:</p>
        <ul>
          <li>Your contact details (name, email, phone number);</li>
          <li>Enquiry, quote, and consultation records;</li>
          <li>Account profile and communication preferences;</li>
          <li>Messages and interaction history collected through our website or Meta channels.</li>
        </ul>

        <h2>5. Information We May Retain</h2>
        <p>
          We may be required to retain certain information even after a deletion request — for example, to
          comply with insurance, tax, and other legal or regulatory obligations, to maintain records of
          policies arranged or claims handled, to resolve disputes, or to prevent fraud. Where we retain
          such information, we keep only what is necessary and for no longer than required by law. Records
          held by an insurer in relation to a policy are governed by that insurer’s own policies, and such
          requests may need to be directed to the insurer.
        </p>

        <h2>6. Deletion Timeline</h2>
        <p>
          We aim to acknowledge deletion requests promptly and to complete deletion of eligible data
          within <strong>30 days</strong> of verifying your request. If we need more time or cannot delete
          certain data due to a legal obligation, we will let you know.
        </p>

        <h2>7. Contact Information</h2>
        <p>For any questions about deleting your data, contact us:</p>
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

        <h2>8. Changes to This Page</h2>
        <p>
          We may update these data-deletion instructions from time to time. When we make material changes,
          we will update the “Effective Date” above. Please review this page periodically.
        </p>
      </Prose>
    </>
  )
}
