import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-purple)]/10 via-transparent to-[var(--accent-cyan)]/8"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--accent-purple)]/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl">
          Ready when you are.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--text-muted)]">
          Your North sandbox credentials work immediately. Sign up, pick demo
          mode, and send your first checkout in under five minutes.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="group inline-flex h-12 items-center gap-2 rounded-lg bg-[var(--accent-purple)] px-8 text-sm font-semibold text-white shadow-[0_0_32px_rgba(124,58,237,0.4)] transition-all duration-200 hover:bg-[var(--accent-purple)]/85 hover:shadow-[0_0_48px_rgba(124,58,237,0.55)] active:scale-[0.98]"
          >
            Start free
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center rounded-lg border border-[var(--brand-border)] bg-[var(--surface)]/60 px-6 text-sm font-medium text-[var(--text-muted)] backdrop-blur-sm transition-colors duration-200 hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}
