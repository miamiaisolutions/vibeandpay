'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, type User } from 'firebase/auth'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore'
import { Users, Receipt, Settings, LogOut, Plus, MessageSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { auth, db } from '@/lib/firebase/client'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMarketingTheme } from '@/components/marketing/ThemeProvider'
import { ThemeToggle } from '@/components/marketing/ThemeToggle'

const SECONDARY_NAV = [
  { href: '/customers', key: 'customers', icon: Users },
  { href: '/transactions', key: 'transactions', icon: Receipt },
  { href: '/settings', key: 'settings', icon: Settings },
] as const

type ThreadRow = {
  id: string
  title: string
  lastMessagePreview: string
  updatedAt: Timestamp | null
}

type BodyProps = {
  user: User
  onNavigate?: () => void
}

export function AppSidebarBody({ user, onNavigate }: BodyProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('Sidebar')
  const { theme } = useMarketingTheme()
  const isDark = theme === 'dark'
  const [threads, setThreads] = useState<ThreadRow[]>([])

  useEffect(() => {
    const q = query(
      collection(db, 'merchants', user.uid, 'threads'),
      orderBy('updatedAt', 'desc'),
      limit(20),
    )
    return onSnapshot(
      q,
      (snap) => {
        setThreads(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              title: String(data.title ?? ''),
              lastMessagePreview: String(data.lastMessagePreview ?? ''),
              updatedAt: (data.updatedAt as Timestamp | null) ?? null,
            }
          }),
        )
      },
      (err) => console.error('[sidebar] threads sub error', err),
    )
  }, [user.uid])

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/login')
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--brand-border)]">
        <Link href="/chat" className="flex items-center" onClick={onNavigate}>
          <Image
            src={isDark ? '/logo-dark.png' : '/logo-light.png'}
            alt="Vibe & Pay"
            width={200}
            height={100}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <ThemeToggle size="sm" />
      </div>

      <div className="px-3 py-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            const id =
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2) + Date.now().toString(36)
            router.push(`/chat/${id}`)
          }}
          className={cn(
            buttonVariants({ size: 'sm' }),
            'w-full justify-start gap-2',
          )}
        >
          <Plus className="h-4 w-4" />
          {t('newChat')}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {threads.length > 0 && (
          <>
            <div className="px-2 pt-1 pb-1.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              {t('recent')}
            </div>
            <div className="space-y-0.5">
              {threads.map((thread) => {
                const active = pathname === `/chat/${thread.id}`
                const display =
                  thread.title || thread.lastMessagePreview || t('newChat')
                return (
                  <Link
                    key={thread.id}
                    href={`/chat/${thread.id}`}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors min-w-0',
                      active
                        ? 'bg-[var(--surface-elevated)] text-[var(--text)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]',
                    )}
                    title={display}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="truncate flex-1 min-w-0">{display}</span>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      <nav className="px-2 py-3 border-t border-[var(--brand-border)] space-y-1">
        {SECONDARY_NAV.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-[var(--surface-elevated)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(key)}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[var(--brand-border)] space-y-2">
        <div className="px-2 py-1 text-xs text-[var(--text-muted)] truncate">
          {user.email}
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            handleSignOut()
          }}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t('signOut')}
        </button>
      </div>
    </div>
  )
}

export function AppSidebar({ user }: { user: User }) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r border-[var(--brand-border)] bg-[var(--surface)]">
      <AppSidebarBody user={user} />
    </aside>
  )
}
