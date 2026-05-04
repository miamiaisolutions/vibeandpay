import type { Metadata } from 'next'
import { LegalShell } from '@/components/marketing/LegalShell'

export const metadata: Metadata = {
  title: 'Terms of Service · Vibe & Pay',
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="May 3, 2026"
      intro="These terms govern your use of Vibe & Pay. By creating an account or sending a payment through the service, you agree to them. They are written to be readable; if anything is unclear, ask us."
    >
      <section>
        <h2>1. The service</h2>
        <p>
          Vibe & Pay is a chat-based interface that helps North merchants send
          checkouts and invoices, manage customers, and pull reports. Payments
          themselves are processed by North; we coordinate the requests.
        </p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <p>
          You are responsible for keeping your login credentials and your North
          API key secure. You must not share account access with anyone outside
          your business and must notify us if you suspect a credential has been
          compromised.
        </p>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <p>You agree not to use the service to:</p>
        <ul>
          <li>Process payments for transactions prohibited by North or applicable law.</li>
          <li>Impersonate another person or business.</li>
          <li>Reverse engineer, scrape, or otherwise abuse the service.</li>
          <li>Send unsolicited messages to customers who have not opted in.</li>
        </ul>
      </section>

      <section>
        <h2>4. Payments and fees</h2>
        <p>
          Vibe & Pay does not charge per-transaction fees during the hackathon
          program. Payment processing fees are charged by North under your
          existing North agreement. We do not hold funds on your behalf.
        </p>
      </section>

      <section>
        <h2>5. Termination</h2>
        <p>
          You may close your account at any time from settings. We may suspend
          or terminate accounts that violate these terms or that present a risk
          to other users, after reasonable notice when possible.
        </p>
      </section>

      <section>
        <h2>6. Disclaimers</h2>
        <p>
          The service is provided <strong>as is</strong>. We do not guarantee
          uninterrupted operation, and we are not responsible for downstream
          delays or failures in the North API. To the maximum extent permitted
          by law, our total liability is limited to the amounts you have paid
          us in the twelve months before the claim.
        </p>
      </section>

      <section>
        <h2>7. Changes</h2>
        <p>
          We may update these terms when our product or legal obligations
          change. Material changes will be announced in-app and dated above.
          Continued use after a change constitutes acceptance.
        </p>
      </section>
    </LegalShell>
  )
}
