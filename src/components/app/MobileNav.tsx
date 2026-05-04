'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import type { User } from 'firebase/auth'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AppSidebarBody } from './AppSidebar'
import { useMarketingTheme } from '@/components/marketing/ThemeProvider'
import { ThemeToggle } from '@/components/marketing/ThemeToggle'

export function MobileNav({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { theme } = useMarketingTheme()
  const isDark = theme === 'dark'

  // Auto-close the drawer when the route changes (e.g., user taps a nav item).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <header className="md:hidden flex items-center justify-between gap-3 border-b border-[var(--brand-border)] bg-[var(--surface)] px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/chat" className="flex items-center" aria-label="Vibe & Pay">
            <Image
              src={isDark ? '/logo-dark.png' : '/logo-light.png'}
              alt="Vibe & Pay"
              width={180}
              height={90}
              priority
              className="h-8 w-auto"
            />
          </Link>
        </div>
        <ThemeToggle size="sm" />
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] p-0 bg-[var(--surface)] border-[var(--brand-border)]"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebarBody user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
