import { MessageSquareCode, CreditCard, Users, Activity } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

type Feature = {
  title: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  accent: 'purple' | 'cyan'
}

const FEATURES: Feature[] = [
  {
    title: 'Natural-language payments',
    description:
      'Type "send #checkout to @george for $300" and Vibe drafts the request. Confirm with one click.',
    icon: MessageSquareCode,
    accent: 'purple',
  },
  {
    title: 'Embedded checkout',
    description:
      'Customers pay on a branded page that opens straight from the email. No redirects, no account required.',
    icon: CreditCard,
    accent: 'cyan',
  },
  {
    title: 'Smart customer memory',
    description:
      '@-mention any customer to pull their email, history, and preferred language into the conversation.',
    icon: Users,
    accent: 'purple',
  },
  {
    title: 'Real-time payment tracking',
    description:
      "When a charge clears, Vibe posts in the thread that started it. You'll know before the email lands.",
    icon: Activity,
    accent: 'cyan',
  },
]

export function FeaturesGrid() {
  return (
    <section className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
            Everything North can do, from a chat window
          </h2>
          <p className="mt-4 text-lg text-[var(--text-muted)]">
            Checkouts, invoices, refunds, reports. All your North workflows,
            handled without leaving the conversation.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  const isPurple = feature.accent === 'purple'
  const iconBg = isPurple
    ? 'bg-[var(--accent-purple)]/15 text-[var(--accent-purple)]'
    : 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]'
  const hoverGlow = isPurple
    ? 'hover:shadow-[0_0_28px_rgba(124,58,237,0.18)]'
    : 'hover:shadow-[0_0_28px_rgba(6,182,212,0.18)]'

  return (
    <div
      className={`group relative flex flex-col rounded-xl border border-[var(--brand-border)] bg-[var(--surface)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand-border)]/80 ${hoverGlow}`}
    >
      <div
        className={`inline-flex size-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[var(--text)]">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        {feature.description}
      </p>
    </div>
  )
}
