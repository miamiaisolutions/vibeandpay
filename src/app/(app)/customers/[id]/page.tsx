'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { auth, db } from '@/lib/firebase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { StatusPill, type TransactionStatus } from '@/components/transactions/StatusPill'
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format'

type Customer = {
  name: string
  email: string
  phone: string | null
  company: string | null
  notes: string
  preferredLanguage: 'en' | 'es'
}

type TxRow = {
  id: string
  type: string
  amount: number
  status: TransactionStatus
  sentAt: Timestamp | null
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: customerId } = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'merchants', user.uid, 'customers', customerId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true)
          setLoading(false)
          return
        }
        const data = snap.data() ?? {}
        setCustomer({
          name: String(data.name ?? ''),
          email: String(data.email ?? ''),
          phone: (data.phone as string | null) ?? null,
          company: (data.company as string | null) ?? null,
          notes: String(data.notes ?? ''),
          preferredLanguage:
            (data.preferredLanguage as 'en' | 'es') ?? 'en',
        })
        setLoading(false)
      },
      (err) => {
        console.error('[customer] subscribe error', err)
        setLoading(false)
      },
    )
    return unsub
  }, [user, customerId])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'merchants', user.uid, 'transactions'),
      where('customerId', '==', customerId),
      orderBy('sentAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(
        snap.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            type: String(data.type ?? 'checkout'),
            amount: Number(data.amount ?? 0),
            status: String(data.status ?? 'sent') as TransactionStatus,
            sentAt: (data.sentAt as Timestamp | null) ?? null,
          }
        }),
      )
    })
    return unsub
  }, [user, customerId])

  async function handleSave(values: Customer) {
    if (!user) throw new Error('Not signed in.')
    setSaved(null)
    const idToken = await user.getIdToken()
    const res = await fetch(`/api/customers/${customerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        company: values.company || null,
        notes: values.notes,
        preferredLanguage: values.preferredLanguage,
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? 'Save failed.')
    }
    setSaved('Saved.')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  if (notFound || !customer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-sm text-[var(--text-muted)]">
          That customer doesn&apos;t exist or was removed.
        </p>
        <Link
          href="/customers"
          className="text-sm text-[var(--accent-cyan)] hover:underline"
        >
          ← Back to customers
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Customers
          </Link>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">{customer.email}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Edits propagate to the customer&apos;s name on past transactions
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerForm
              key={customerId}
              initial={{
                name: customer.name,
                email: customer.email,
                phone: customer.phone ?? '',
                company: customer.company ?? '',
                notes: customer.notes,
                preferredLanguage: customer.preferredLanguage,
              }}
              submitLabel="Save changes"
              onSubmit={handleSave}
            />
            {saved && (
              <div role="status" className="text-sm text-[var(--success)] mt-3">
                {saved}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {transactions.length === 0
                ? 'No transactions for this customer yet.'
                : `${transactions.length} transaction${transactions.length === 1 ? '' : 's'} on file.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {transactions.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <tr>
                    <th className="text-left font-medium px-6 py-2">Type</th>
                    <th className="text-left font-medium py-2">Status</th>
                    <th className="text-right font-medium py-2">Amount</th>
                    <th className="text-right font-medium px-6 py-2">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-t border-[var(--brand-border)]"
                    >
                      <td className="px-6 py-2 capitalize">
                        {tx.type.replace('-', ' ')}
                      </td>
                      <td className="py-2">
                        <StatusPill status={tx.status} />
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-2 text-right text-[var(--text-muted)]">
                        {formatRelativeTime(tx.sentAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
