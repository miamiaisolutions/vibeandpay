import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-[var(--text)]">Vibe &amp; Pay</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Built for North merchants. © {year}.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[var(--text-muted)]">
          <Link href="/legal/terms" className="transition-colors hover:text-[var(--text)]">
            Terms
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-[var(--text)]">
            Privacy
          </Link>
          <Link href="/legal/security" className="transition-colors hover:text-[var(--text)]">
            Security
          </Link>
          <Link href="/login" className="transition-colors hover:text-[var(--text)]">
            Sign in
          </Link>
          <Link
            href="/register"
            className="font-medium text-[var(--accent-cyan)] transition-colors hover:text-[var(--accent-cyan)]/80"
          >
            Start free
          </Link>
        </nav>
      </div>
    </footer>
  )
}
