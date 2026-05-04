'use client'

import { Sun, Moon } from 'lucide-react'
import { useMarketingTheme } from './ThemeProvider'

type Size = 'sm' | 'md'

export function ThemeToggle({
  size = 'md',
  className = '',
}: {
  size?: Size
  className?: string
}) {
  const { theme, toggle } = useMarketingTheme()
  const isDark = theme === 'dark'

  const dim = size === 'sm' ? 'size-9' : 'size-11'
  const icon = size === 'sm' ? 'size-4' : 'size-4'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex ${dim} items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--surface)]/60 text-[var(--text-muted)] transition-colors duration-200 hover:bg-[var(--surface-elevated)] hover:text-[var(--text)] ${className}`}
    >
      {isDark ? <Sun className={icon} /> : <Moon className={icon} />}
    </button>
  )
}
