'use client'

import { useMarketingTheme } from './ThemeProvider'

// Provides the opaque page-level background color + ambient gradient.
// Sits at z=-20 (behind the starfield at z=-10).
export function PageBackground() {
  const { theme } = useMarketingTheme()

  return theme === 'dark' ? (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 bg-[var(--bg)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.18),transparent_60%),radial-gradient(ellipse_60%_50%_at_80%_30%,rgba(6,182,212,0.10),transparent_70%),linear-gradient(180deg,var(--bg)_0%,#06061A_60%,#020213_100%)]"
    />
  ) : (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 bg-[var(--bg)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-5%,rgba(124,58,237,0.07),transparent_55%),radial-gradient(ellipse_50%_40%_at_80%_20%,rgba(6,182,212,0.05),transparent_60%)]"
    />
  )
}
