'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MarketingThemeProvider, useMarketingTheme } from '@/components/marketing/ThemeProvider'
import { ThemeToggle } from '@/components/marketing/ThemeToggle'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MarketingThemeProvider>
      <AuthShell>{children}</AuthShell>
    </MarketingThemeProvider>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const { theme } = useMarketingTheme()
  const isDark = theme === 'dark'

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--bg)]">
      <div className="absolute right-4 top-4">
        <ThemeToggle size="sm" />
      </div>

      <Link href="/" className="mb-10 flex flex-col items-center" aria-label="Vibe & Pay home">
        <Image
          src={isDark ? '/logo-dark.png' : '/logo-light.png'}
          alt="Vibe & Pay"
          width={240}
          height={120}
          priority
          className="h-14 w-auto"
        />
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          AI copilot for North merchants
        </p>
      </Link>

      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
