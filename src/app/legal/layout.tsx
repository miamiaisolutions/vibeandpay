import { MarketingThemeProvider } from '@/components/marketing/ThemeProvider'
import { PageBackground } from '@/components/marketing/PageBackground'
import { Starfield } from '@/components/marketing/Starfield'
import { Nav } from '@/components/marketing/Nav'
import { Footer } from '@/components/marketing/Footer'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingThemeProvider>
      <div className="relative flex min-h-screen flex-1 flex-col text-[var(--text)]">
        <PageBackground />
        <Starfield />
        <Nav />
        <main className="relative flex-1">{children}</main>
        <Footer />
      </div>
    </MarketingThemeProvider>
  )
}
