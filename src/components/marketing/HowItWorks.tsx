import type { ReactNode } from 'react'

type Step = {
  index: string
  title: string
  body: ReactNode
}

const STEPS: Step[] = [
  {
    index: '01',
    title: 'Sign up',
    body: 'Create an account with email and password. Pick demo mode and we seed customers and transactions so you can explore right away.',
  },
  {
    index: '02',
    title: 'Connect North',
    body: 'Paste your North API key, checkout ID, and profile ID into Settings. They are encrypted before they touch the database.',
  },
  {
    index: '03',
    title: 'Chat to get paid',
    body: (
      <>
        Type{' '}
        <code className="rounded px-1 py-0.5 font-mono text-[0.8em] text-[var(--accent-cyan)] ring-1 ring-[var(--accent-cyan)]/20">
          #checkout
        </code>{' '}
        and mention{' '}
        <code className="rounded px-1 py-0.5 font-mono text-[0.8em] text-[var(--accent-purple)] ring-1 ring-[var(--accent-purple)]/20">
          @customer
        </code>{' '}
        with an amount. Vibe drafts a confirmation card; you approve; the
        customer gets a branded payment link by email.
      </>
    ),
  },
]

export function HowItWorks() {
  return (
    <section className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
            From signup to paid in five minutes
          </h2>
          <p className="mt-4 text-lg text-[var(--text-muted)]">
            No setup wizard, no integration sprint. Three steps and you are live.
          </p>
        </div>

        <ol className="relative mt-14">
          <span
            aria-hidden="true"
            className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--accent-purple)]/60 via-[var(--accent-cyan)]/30 to-transparent"
          />
          {STEPS.map((step) => (
            <li key={step.index} className="relative flex gap-6 pb-10 last:pb-0">
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--brand-border)] bg-[var(--surface-elevated)] font-mono text-sm font-semibold text-[var(--accent-cyan)] shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                {step.index}
              </span>
              <div className="pt-1.5">
                <h3 className="text-lg font-semibold text-[var(--text)]">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
