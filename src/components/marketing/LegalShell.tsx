import type { ReactNode } from 'react'

export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <header className="border-b border-[var(--brand-border)] pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
          Last updated · {updated}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-[var(--text-muted)]">{intro}</p>
      </header>

      <div className="mt-10 space-y-10 text-[var(--text-muted)] [&_a]:text-[var(--accent-cyan)] [&_a:hover]:underline [&_h2]:mt-2 [&_h2]:scroll-mt-20 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--text)] [&_p]:mt-3 [&_p]:leading-relaxed [&_strong]:text-[var(--text)] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>

      <footer className="mt-16 border-t border-[var(--brand-border)] pt-8 text-sm text-[var(--text-muted)]">
        <p>
          Questions? Reach us at{' '}
          <a href="mailto:hello@vibeandpay.com">hello@vibeandpay.com</a>.
        </p>
      </footer>
    </article>
  )
}
