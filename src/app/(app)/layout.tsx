'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { Loader2 } from 'lucide-react'
import { auth } from '@/lib/firebase/client'
import { AppSidebar } from '@/components/app/AppSidebar'
import { MobileNav } from '@/components/app/MobileNav'
import { I18nProvider } from '@/components/I18nProvider'
import { MarketingThemeProvider } from '@/components/marketing/ThemeProvider'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
      if (!u) router.replace('/login')
    })
  }, [router])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  if (!user) {
    // about to redirect to /login
    return null
  }

  return (
    <MarketingThemeProvider>
      <I18nProvider>
        <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)]">
          <MobileNav user={user} />
          <AppSidebar user={user} />
          <main className="flex-1 flex flex-col min-w-0">{children}</main>
        </div>
      </I18nProvider>
    </MarketingThemeProvider>
  )
}
