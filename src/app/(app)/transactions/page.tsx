'use client'

import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore'
import { Search, Loader2 } from 'lucide-react'
import { auth, db } from '@/lib/firebase/client'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { StatusPill, type TransactionStatus } from '@/components/transactions/StatusPill'
import {
  TransactionDetailPanel,
  type TransactionRow,
} from '@/components/transactions/TransactionDetailPanel'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format'

type Filter = 'all' | 'sent' | 'paid' | 'overdue' | 'refunded'

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'refunded', label: 'Refunded' },
]

function deriveDisplayStatus(tx: TransactionRow): TransactionStatus {
  if (tx.status === 'sent' && tx.dueDate) {
    const dueMs = tx.dueDate.toDate().getTime()
    if (dueMs < Date.now()) return 'overdue'
  }
  return tx.status
}

export default function TransactionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'merchants', user.uid, 'transactions'),
      orderBy('sentAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            type: String(data.type ?? 'checkout'),
            customerId: (data.customerId as string | null) ?? null,
            customerName: String(data.customerName ?? ''),
            amount: Number(data.amount ?? 0),
            status: String(data.status ?? 'sent') as TransactionStatus,
            northSessionToken:
              (data.northSessionToken as string | null) ?? null,
            northTransactionId:
              (data.northTransactionId as string | null) ?? null,
            paymentUrl: (data.paymentUrl as string | null) ?? null,
            lineItems:
              (data.lineItems as TransactionRow['lineItems']) ?? [],
            dueDate: (data.dueDate as Timestamp | null) ?? null,
            sentAt: (data.sentAt as Timestamp | null) ?? null,
            viewedAt: (data.viewedAt as Timestamp | null) ?? null,
            paidAt: (data.paidAt as Timestamp | null) ?? null,
            emailSentTo: String(data.emailSentTo ?? ''),
          }
        })
        setTransactions(rows)
        setLoading(false)
      },
      (err) => {
        console.error('[transactions] subscribe error', err)
        setLoading(false)
      },
    )
    return unsub
  }, [user])

  const filtered = useMemo(() => {
    const lcSearch = search.trim().toLowerCase()
    return transactions.filter((tx) => {
      if (lcSearch && !tx.customerName.toLowerCase().includes(lcSearch)) {
        return false
      }
      const display = deriveDisplayStatus(tx)
      if (filter === 'all') return true
      if (filter === 'sent')
        return display === 'sent' || display === 'viewed'
      if (filter === 'paid') return display === 'paid'
      if (filter === 'overdue') return display === 'overdue'
      if (filter === 'refunded') return display === 'refunded'
      return true
    })
  }, [transactions, search, filter])

  const selected = useMemo(
    () => transactions.find((tx) => tx.id === selectedId) ?? null,
    [transactions, selectedId],
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="border-b border-[var(--brand-border)] px-4 md:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <div className="text-sm text-[var(--text-muted)]">
            {transactions.length} total
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              type="search"
              placeholder="Search by customer name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => {
              const active = filter === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-[var(--accent-purple)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text)]',
                  )}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
            <p className="text-sm">
              {transactions.length === 0
                ? 'No transactions yet. Send a checkout from chat to get started.'
                : 'No transactions match those filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="text-left font-medium px-4 md:px-8 py-3">
                  Customer
                </th>
                <th className="text-left font-medium py-3">Type</th>
                <th className="text-left font-medium py-3">Status</th>
                <th className="text-right font-medium py-3">Amount</th>
                <th className="text-right font-medium px-4 md:px-8 py-3">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const display = deriveDisplayStatus(tx)
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedId(tx.id)}
                    className="border-t border-[var(--brand-border)] hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 md:px-8 py-3 font-medium">
                      {tx.customerName}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] capitalize">
                      {tx.type.replace('-', ' ')}
                    </td>
                    <td className="py-3">
                      <StatusPill status={display} />
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 md:px-8 py-3 text-right text-[var(--text-muted)]">
                      {formatRelativeTime(tx.sentAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <TransactionDetailPanel
        tx={selected}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </div>
  )
}
