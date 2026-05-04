'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, Clock, RefreshCw } from 'lucide-react'

// ────────────────────────────────────────────────────────────────────────────
// Scene definitions — each demos a different AI tool from FEATURES.md.
// ────────────────────────────────────────────────────────────────────────────

type Scene = {
  prompt: string
  card: React.ReactElement
}

const SCENES: Scene[] = [
  { prompt: 'send #checkout to @george for $300', card: <CheckoutCard /> },
  { prompt: 'send #invoice to @beth for $640 due in 15 days', card: <InvoiceCard /> },
  { prompt: "show me last week's #transactions", card: <TransactionsCard /> },
  { prompt: "show this week's #report", card: <ReportCard /> },
]

const TYPE_MS = 46
const ERASE_MS = 22
const PRE_TYPE_MS = 500
const POST_TYPE_MS = 650
const HOLD_MS = 3800
const FADE_MS = 450
const SCENE_GAP_MS = 350

// ────────────────────────────────────────────────────────────────────────────

export function Hero() {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [showCard, setShowCard] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(SCENES[0].prompt)
      setShowCard(true)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms)
      })

    const runScene = async (idx: number) => {
      if (cancelled) return
      setSceneIdx(idx)
      setTyped('')
      setShowCard(false)

      await wait(PRE_TYPE_MS)
      if (cancelled) return

      const p = SCENES[idx].prompt
      for (let i = 1; i <= p.length; i++) {
        if (cancelled) return
        setTyped(p.slice(0, i))
        await wait(TYPE_MS)
      }

      await wait(POST_TYPE_MS)
      if (cancelled) return
      setShowCard(true)

      await wait(HOLD_MS)
      if (cancelled) return

      // Last scene — leave prompt and card visible; animation stops here.
      if (idx === SCENES.length - 1) return

      setShowCard(false)

      await wait(FADE_MS)
      if (cancelled) return

      for (let i = p.length - 1; i >= 0; i--) {
        if (cancelled) return
        setTyped(p.slice(0, i))
        await wait(ERASE_MS)
      }

      await wait(SCENE_GAP_MS)
      if (cancelled) return

      runScene(idx + 1)
    }

    runScene(0)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const cursorVisible = !showCard

  return (
    <section className="relative px-6 pt-16 pb-16 sm:pt-24 sm:pb-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex flex-col">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/10 px-3 py-1">
            <span className="size-1.5 rounded-full bg-[var(--accent-cyan)]" aria-hidden="true" />
            <span className="text-xs font-medium text-[var(--accent-purple)]">
              Built for North merchants
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-bold leading-[1.0] tracking-tight text-[var(--text)] sm:text-5xl lg:text-[4.25rem]">
            Chat to
            <br />
            <span className="bg-gradient-to-r from-[var(--accent-purple)] via-[#A78BFA] to-[var(--accent-cyan)] bg-clip-text text-transparent">
              get paid.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--text-muted)]">
            Describe a payment in plain English and Vibe handles the North side.
            Send checkouts, draft invoices, pull reports. Confirm with a click.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-[var(--accent-purple)] px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition-all duration-200 hover:bg-[var(--accent-purple)]/85 hover:shadow-[0_0_32px_rgba(124,58,237,0.55)] active:scale-[0.98]"
            >
              Start free
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-lg border border-[var(--brand-border)] bg-[var(--surface)]/60 px-6 text-sm font-semibold text-[var(--text)] backdrop-blur-sm transition-colors duration-200 hover:bg-[var(--surface-elevated)]"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-5 text-sm text-[var(--text-muted)]">
            North sandbox credentials work out of the box.
          </p>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-[var(--accent-purple)]/20 via-transparent to-[var(--accent-cyan)]/20 blur-3xl"
          />
          <ChatPreview
            typed={typed}
            cursorVisible={cursorVisible}
            showCard={showCard}
            sceneIdx={sceneIdx}
          />
        </div>
      </div>
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────────────

function ChatPreview({
  typed,
  cursorVisible,
  showCard,
  sceneIdx,
}: {
  typed: string
  cursorVisible: boolean
  showCard: boolean
  sceneIdx: number
}) {
  return (
    <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--surface)]/80 p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-6">
      <div className="flex items-center gap-2 border-b border-[var(--brand-border)] pb-3">
        <span className="size-2.5 rounded-full bg-[#FF5F56]/70" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-[#FFBD2E]/70" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-[#27C93F]/70" aria-hidden="true" />
        <span className="ml-3 font-mono text-xs text-[var(--text-muted)]">new chat</span>
      </div>

      <div className="space-y-4 pt-5">
        <div className="flex justify-end">
          <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-[var(--accent-purple)]/15 px-4 py-3 ring-1 ring-[var(--accent-purple)]/30">
            <p className="font-mono text-sm leading-relaxed text-[var(--text)]">
              <PromptText typed={typed} />
              {cursorVisible && (
                <span
                  className="ml-0.5 inline-block h-4 w-[2px] -translate-y-[1px] animate-pulse bg-[var(--accent-cyan)] align-middle"
                  aria-hidden="true"
                />
              )}
              {/* Stable height — keep an em-space when the bubble would otherwise be empty */}
              {!typed && !cursorVisible && '​'}
            </p>
          </div>
        </div>

        <div
          className={`min-h-[260px] transition-all duration-500 ease-out ${
            showCard
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          }`}
          aria-hidden={!showCard}
        >
          {SCENES[sceneIdx].card}
        </div>
      </div>
    </div>
  )
}

function PromptText({ typed }: { typed: string }) {
  const out: React.ReactNode[] = []
  let buffer = ''
  let key = 0
  const flush = () => {
    if (buffer) {
      out.push(<span key={`t-${key++}`}>{buffer}</span>)
      buffer = ''
    }
  }
  for (let i = 0; i < typed.length; i++) {
    const ch = typed[i]
    if (ch === '#' || ch === '@') {
      flush()
      let j = i + 1
      while (j < typed.length && /[\w-]/.test(typed[j])) j++
      const token = typed.slice(i, j)
      const color =
        ch === '#' ? 'text-[var(--accent-cyan)]' : 'text-[var(--accent-purple)]'
      out.push(
        <span key={`tk-${key++}`} className={`${color} font-medium`}>
          {token}
        </span>
      )
      i = j - 1
    } else {
      buffer += ch
    }
  }
  flush()
  return <>{out}</>
}

// ────────────────────────────────────────────────────────────────────────────
// Cards
// ────────────────────────────────────────────────────────────────────────────

function CardShell({
  eyebrow,
  tag,
  children,
}: {
  eyebrow: string
  tag: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--surface-elevated)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent-cyan)]">
          {eyebrow}
        </p>
        <span className="rounded-md bg-[var(--accent-purple)]/15 px-2 py-1 font-mono text-xs text-[var(--accent-purple)]">
          {tag}
        </span>
      </div>
      {children}
    </div>
  )
}

function ConfirmRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--accent-purple)] px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-[var(--accent-purple)]/85 active:scale-[0.98]"
      >
        {children}
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-transparent px-4 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)]"
      >
        Cancel
      </button>
    </div>
  )
}

function CheckoutCard() {
  return (
    <CardShell eyebrow="Send checkout" tag="#checkout">
      <p className="mt-1 text-base font-semibold text-[var(--text)]">
        Send checkout to George Smith
      </p>
      <dl className="mt-4 space-y-3 border-t border-[var(--brand-border)] pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-[var(--text-muted)]">Amount</dt>
          <dd className="font-mono text-base font-semibold text-[var(--text)]">$300.00</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[var(--text-muted)]">Send to</dt>
          <dd className="font-mono text-sm text-[var(--text)]">george@example.com</dd>
        </div>
      </dl>
      <ConfirmRow>Send checkout</ConfirmRow>
    </CardShell>
  )
}

function InvoiceCard() {
  return (
    <CardShell eyebrow="Send invoice" tag="#invoice">
      <p className="mt-1 text-base font-semibold text-[var(--text)]">Invoice Beth Chen</p>
      <dl className="mt-4 space-y-3 border-t border-[var(--brand-border)] pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-[var(--text-muted)]">Amount</dt>
          <dd className="font-mono text-base font-semibold text-[var(--text)]">$640.00</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[var(--text-muted)]">Due</dt>
          <dd className="font-mono text-sm text-[var(--text)]">Net 15 · May 18</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[var(--text-muted)]">Send to</dt>
          <dd className="font-mono text-sm text-[var(--text)]">beth@overdueco.com</dd>
        </div>
      </dl>
      <ConfirmRow>Send invoice</ConfirmRow>
    </CardShell>
  )
}

type TxStatus = 'paid' | 'sent' | 'refund'
type Tx = { name: string; amount: string; status: TxStatus }

const TX_ROWS: Tx[] = [
  { name: 'Carlos Diaz', amount: '$480.00', status: 'paid' },
  { name: 'Alex Rivera', amount: '$150.00', status: 'paid' },
  { name: 'Diana Park', amount: '$1,200.00', status: 'sent' },
  { name: 'Mark Stein', amount: '$85.00', status: 'refund' },
]

function TransactionsCard() {
  return (
    <CardShell eyebrow="Recent transactions" tag="#transactions">
      <p className="mt-1 text-sm text-[var(--text-muted)]">Apr 27 – May 3 · 4 results</p>
      <ul className="mt-4 divide-y divide-[var(--brand-border)] border-t border-[var(--brand-border)]">
        {TX_ROWS.map((t) => (
          <li key={t.name} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-3">
              <StatusDot status={t.status} />
              <span className="text-sm text-[var(--text)]">{t.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-[var(--text)]">{t.amount}</span>
              <StatusPill status={t.status} />
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

function StatusDot({ status }: { status: TxStatus }) {
  const map: Record<TxStatus, { Icon: typeof Check; className: string }> = {
    paid: { Icon: Check, className: 'bg-[var(--success)]/15 text-[var(--success)]' },
    sent: { Icon: Clock, className: 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]' },
    refund: { Icon: RefreshCw, className: 'bg-[var(--warning)]/15 text-[var(--warning)]' },
  }
  const { Icon, className } = map[status]
  return (
    <span
      className={`inline-flex size-6 items-center justify-center rounded-full ${className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
  )
}

function StatusPill({ status }: { status: TxStatus }) {
  const map: Record<TxStatus, { label: string; className: string }> = {
    paid: { label: 'Paid', className: 'bg-[var(--success)]/10 text-[var(--success)]' },
    sent: { label: 'Sent', className: 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]' },
    refund: {
      label: 'Refunded',
      className: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    },
  }
  const { label, className } = map[status]
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  )
}

function ReportCard() {
  const stats: { label: string; value: string; accent?: 'good' | 'warn' }[] = [
    { label: 'Revenue', value: '$4,820.00', accent: 'good' },
    { label: 'Invoices paid', value: '7' },
    { label: 'Outstanding', value: '$1,840.00', accent: 'warn' },
    { label: 'New customers', value: '2' },
  ]
  return (
    <CardShell eyebrow="This week" tag="#report">
      <p className="mt-1 text-sm text-[var(--text-muted)]">Apr 27 – May 3, 2026</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--brand-border)] pt-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--brand-border)]/70 bg-[var(--surface)]/40 p-3"
          >
            <dt className="text-xs text-[var(--text-muted)]">{s.label}</dt>
            <dd
              className={`mt-1 font-mono text-base font-semibold ${
                s.accent === 'good'
                  ? 'text-[var(--success)]'
                  : s.accent === 'warn'
                    ? 'text-[var(--warning)]'
                    : 'text-[var(--text)]'
              }`}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </CardShell>
  )
}
