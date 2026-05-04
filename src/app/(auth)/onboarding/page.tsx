'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Sparkles, FilePlus2, Loader2 } from 'lucide-react'
import { auth, db } from '@/lib/firebase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Mode = 'demo' | 'fresh'

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [pending, setPending] = useState<Mode | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) {
        setAuthReady(true)
        router.replace('/login')
        return
      }
      // If they already onboarded, skip straight to chat.
      try {
        const snap = await getDoc(doc(db, 'merchants', u.uid))
        if (snap.exists() && snap.data()?.onboardingComplete === true) {
          router.replace('/chat')
          return
        }
      } catch {
        // If the merchant doc read fails for any reason, fall through and
        // show the picker — better than an opaque error screen.
      }
      setAuthReady(true)
    })
  }, [router])

  async function pickMode(mode: Mode) {
    if (!user) return
    setError(null)
    setPending(mode)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Onboarding failed.')
      }
      router.push('/settings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed.')
      setPending(null)
    }
  }

  if (!authReady) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Pick your starting point</h1>
        <p className="text-sm text-[var(--text-muted)]">
          You can change this later — Demo Mode just preloads sample data so the
          app feels alive while you explore.
        </p>
      </div>

      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => pickMode('demo')}
          disabled={pending !== null}
          className="text-left transition-shadow duration-200 hover:shadow-[0_0_24px_rgba(124,58,237,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--accent-purple)]">
                  {pending === 'demo' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <CardTitle>Demo Mode</CardTitle>
                  <CardDescription>
                    Preload 8 sample customers and 12 sample transactions.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">
                Best for kicking the tires. You can wipe the data later from
                Settings.
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => pickMode('fresh')}
          disabled={pending !== null}
          className="text-left transition-shadow duration-200 hover:shadow-[0_0_24px_rgba(6,182,212,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--accent-cyan)]">
                  {pending === 'fresh' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FilePlus2 className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <CardTitle>Start Fresh</CardTitle>
                  <CardDescription>
                    Empty workspace. Add your own customers as you go.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">
                Best for using Vibe &amp; Pay with your real customers from day
                one.
              </p>
            </CardContent>
          </Card>
        </button>
      </div>

      {error && (
        <div role="alert" className="text-sm text-center text-[var(--danger)]">
          {error}
        </div>
      )}
    </div>
  )
}
