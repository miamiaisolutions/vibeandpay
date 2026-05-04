import { MarketingThemeProvider } from '@/components/marketing/ThemeProvider'
import { PageBackground } from '@/components/marketing/PageBackground'
import { Starfield } from '@/components/marketing/Starfield'
import { Nav } from '@/components/marketing/Nav'
import { Hero } from '@/components/marketing/Hero'
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { FAQ } from '@/components/marketing/FAQ'
import { CTA } from '@/components/marketing/CTA'
import { Footer } from '@/components/marketing/Footer'

export default function HomePage() {
  return (
    <MarketingThemeProvider>
      <div className="relative flex min-h-screen flex-1 flex-col text-[var(--text)]">
        <PageBackground />
        <Starfield />

        <Nav />

        <main className="relative flex-1">
          <Hero />
          <FeaturesGrid />
          <HowItWorks />
          <FAQ />
          <CTA />
        </main>

        <Footer />
      </div>
    </MarketingThemeProvider>
  )
}
