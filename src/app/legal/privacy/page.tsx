import type { Metadata } from 'next'
import { LegalShell } from '@/components/marketing/LegalShell'

export const metadata: Metadata = {
  title: 'Privacy Policy · Vibe & Pay',
}

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="May 3, 2026"
      intro="We collect the minimum information needed to run the service. This page explains what we store, why, and how to ask for it back."
    >
      <section>
        <h2>1. What we collect</h2>
        <p>From you (the merchant):</p>
        <ul>
          <li>
            <strong>Account info</strong> — email, password hash, business name.
          </li>
          <li>
            <strong>North credentials</strong> — API key, checkout ID, profile
            ID. Encrypted before storage; see Security.
          </li>
          <li>
            <strong>Settings</strong> — language, brand color, default invoice
            terms, logo URL.
          </li>
        </ul>
        <p>From your customers:</p>
        <ul>
          <li>
            Name, email, phone, company, preferred language, and the
            transactions you create for them.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <ul>
          <li>To send checkouts and invoices on your behalf.</li>
          <li>To poll North for transaction status updates.</li>
          <li>To deliver the AI features that power the chat.</li>
          <li>To fix bugs and improve the product.</li>
        </ul>
        <p>
          We do not sell personal information. We do not use customer email
          addresses for marketing.
        </p>
      </section>

      <section>
        <h2>3. AI processing</h2>
        <p>
          When you send a chat message, we forward the conversation context and
          a redacted version of your customer list to Anthropic for inference.
          API keys, secrets, and your password are never sent to the model.
          Anthropic does not retain or train on this data per our agreement.
        </p>
      </section>

      <section>
        <h2>4. Sub-processors</h2>
        <ul>
          <li>
            <strong>Firebase (Google)</strong> — authentication and database.
          </li>
          <li>
            <strong>Vercel</strong> — hosting and edge delivery.
          </li>
          <li>
            <strong>Resend</strong> — outbound branded email delivery.
          </li>
          <li>
            <strong>Anthropic</strong> — AI inference for the chat copilot.
          </li>
          <li>
            <strong>North</strong> — payment processing.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Cookies and storage</h2>
        <p>
          We use a single first-party cookie to keep you signed in. The
          marketing site stores your theme preference (dark or light) in
          browser localStorage. We do not use third-party tracking cookies.
        </p>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>
          You can export or delete your data at any time from settings. To
          request data on a customer's behalf or for any other privacy
          question, email <a href="mailto:privacy@vibeandpay.com">privacy@vibeandpay.com</a>.
          We respond within 30 days.
        </p>
      </section>

      <section>
        <h2>7. Retention</h2>
        <p>
          We keep account and transaction data for as long as your account is
          active, plus seven years for financial recordkeeping. Closed accounts
          are anonymized, except where law requires retention.
        </p>
      </section>
    </LegalShell>
  )
}
