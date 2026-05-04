'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type MarketingTheme = 'dark' | 'light'

type Ctx = { theme: MarketingTheme; toggle: () => void }

const ThemeCtx = createContext<Ctx>({ theme: 'dark', toggle: () => {} })

export const useMarketingTheme = () => useContext(ThemeCtx)

// CSS variable overrides applied when theme === 'light'.
// The :root defaults in globals.css stay untouched — we just shadow them
// on this subtree via the style prop on the wrapper div.
const LIGHT: Record<string, string> = {
  '--bg': '#F4F3FF',
  '--surface': '#FFFFFF',
  '--surface-elevated': '#EBEBFF',
  '--text': '#0A0A1F',
  '--text-muted': '#3A4060',
  '--brand-border': '#D2CEEE',
}

export function MarketingThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<MarketingTheme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('vp-marketing-theme') as MarketingTheme | null
    if (saved === 'light' || saved === 'dark') setTheme(saved)
  }, [])

  const toggle = () =>
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('vp-marketing-theme', next)
      return next
    })

  const style = theme === 'light' ? (LIGHT as React.CSSProperties) : {}

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div style={style}>{children}</div>
    </ThemeCtx.Provider>
  )
}
