'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sun, Moon } from 'lucide-react'
import { useMarketingTheme } from './ThemeProvider'

export function Nav() {
  const { theme, toggle } = useMarketingTheme()
  const isDark = theme === 'dark'

  return (
    <header
      className={`sticky top-0 z-50 border-b border-[var(--brand-border)]/40 ${
        isDark ? 'bg-[#010214]' : 'bg-[var(--bg)]'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Image
            src={isDark ? '/logo-dark.png' : '/logo-light.png'}
            alt="Vibe & Pay"
            width={200}
            height={100}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--surface)]/60 text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Link
            href="/login"
            className="hidden h-9 items-center rounded-lg px-4 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] sm:inline-flex"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="group inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent-purple)] px-4 text-sm font-semibold text-white shadow-[0_0_16px_rgba(124,58,237,0.3)] transition-all duration-200 hover:bg-[var(--accent-purple)]/85 hover:shadow-[0_0_24px_rgba(124,58,237,0.45)] active:scale-[0.98]"
          >
            Start free
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </div>
    </header>
  )
}
