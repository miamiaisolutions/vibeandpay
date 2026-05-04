'use client'

import { useEffect, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import en from '@/i18n/messages/en.json'
import es from '@/i18n/messages/es.json'

const MESSAGES = { en, es } as const
export type Locale = keyof typeof MESSAGES

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    let unsubSnap: (() => void) | null = null
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) {
        unsubSnap()
        unsubSnap = null
      }
      if (!user) {
        setLocale('en')
        return
      }
      const ref = doc(db, 'merchants', user.uid)
      unsubSnap = onSnapshot(ref, (snap) => {
        const lang = snap.data()?.language as Locale | undefined
        if (lang && MESSAGES[lang]) setLocale(lang)
      })
    })
    return () => {
      unsubAuth()
      if (unsubSnap) unsubSnap()
    }
  }, [])

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  )
}
