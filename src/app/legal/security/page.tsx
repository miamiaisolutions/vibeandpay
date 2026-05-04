import type { Metadata } from 'next'
import { LegalShell } from '@/components/marketing/LegalShell'

export const metadata: Metadata = {
  title: 'Security · Vibe & Pay',
}

export default function SecurityPage() {
  return (
    <LegalShell
      title="Security"
      updated="May 3, 2026"
      intro="The most sensitive thing we hold for you is your North API key. This page explains how we keep it safe, how we isolate merchant data, and how to report a vulnerability."
    >
      <section>
        <h2>Credential encryption</h2>
        <p>
          North credentials (API key, checkout ID, profile ID) are encrypted
          with <strong>AES-256-GCM</strong> before they are written to the
          database. The encryption key lives only in the server environment
          and is never exposed to the browser. Decryption happens per-request
          on a server function and the plaintext never leaves memory.
        </p>
      </section>

      <section>
        <h2>Authentication</h2>
        <p>
          Sign-in is handled by Firebase Auth (email plus password). Passwords
          are salted and hashed by Firebase; we never see them. Sessions use
          short-lived ID tokens, refreshed on each load.
        </p>
      </section>

      <section>
        <h2>Data isolation</h2>
        <p>
          All merchant data is nested under{' '}
          <code className="font-mono text-[var(--accent-cyan)]">
            merchants/&#123;uid&#125;
          </code>{' '}
          in Firestore. Security rules deny all reads and writes unless the
          authenticated user matches the document path, which means a merchant
          cannot read another merchant's customers or transactions, even with
          a valid login.
        </p>
      </section>

      <section>
        <h2>Transport</h2>
        <p>
          All network traffic is served over TLS 1.2+. The custom payment
          page (<code className="font-mono text-[var(--accent-cyan)]">/pay/&#91;token&#93;</code>)
          loads North&apos;s embedded checkout iframe directly from
          checkout.north.com — payment card details are never seen or stored
          by our servers.
        </p>
      </section>

      <section>
        <h2>Backups and durability</h2>
        <p>
          Firestore is replicated across multiple zones automatically. We take
          point-in-time backups daily and retain them for 30 days. Logo files
          live in Vercel Blob with the same multi-region durability.
        </p>
      </section>

      <section>
        <h2>Reporting a vulnerability</h2>
        <p>
          If you find a security issue, please email{' '}
          <a href="mailto:security@vibeandpay.com">security@vibeandpay.com</a>{' '}
          with steps to reproduce. We acknowledge reports within 48 hours and
          do not pursue legal action against good-faith researchers who follow
          responsible disclosure.
        </p>
      </section>
    </LegalShell>
  )
}
