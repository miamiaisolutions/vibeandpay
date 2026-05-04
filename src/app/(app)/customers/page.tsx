'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore'
import { Search, Loader2, Plus } from 'lucide-react'
import { auth, db } from '@/lib/firebase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { formatRelativeTime } from '@/lib/utils/format'

type CustomerRow = {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  preferredLanguage: 'en' | 'es'
  lastInteractionAt: Timestamp | null
}

export default function CustomersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'merchants', user.uid, 'customers'),
      orderBy('lastInteractionAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCustomers(
          snap.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              name: String(data.name ?? ''),
              email: String(data.email ?? ''),
              company: (data.company as string | null) ?? null,
              phone: (data.phone as string | null) ?? null,
              preferredLanguage:
                (data.preferredLanguage as 'en' | 'es') ?? 'en',
              lastInteractionAt:
                (data.lastInteractionAt as Timestamp | null) ?? null,
            }
          }),
        )
        setLoading(false)
      },
      (err) => {
        console.error('[customers] subscribe error', err)
        setLoading(false)
      },
    )
    return unsub
  }, [user])

  const filtered = useMemo(() => {
    const lc = search.trim().toLowerCase()
    if (!lc) return customers
    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(lc) ||
        c.email.toLowerCase().includes(lc) ||
        (c.company ?? '').toLowerCase().includes(lc)
      )
    })
  }, [customers, search])

  async function handleCreate(values: {
    name: string
    email: string
    phone: string
    company: string
    notes: string
    preferredLanguage: 'en' | 'es'
  }) {
    if (!user) throw new Error('Not signed in.')
    const idToken = await user.getIdToken()
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        company: values.company || null,
        notes: values.notes || '',
        preferredLanguage: values.preferredLanguage,
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? 'Could not create customer.')
    }
    setAddOpen(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="border-b border-[var(--brand-border)] px-4 md:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Customers</h1>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add customer
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add customer</DialogTitle>
                <DialogDescription>
                  They&apos;ll appear in your <span className="font-mono">@</span> picker
                  in chat right away.
                </DialogDescription>
              </DialogHeader>
              <CustomerForm
                submitLabel="Add customer"
                onSubmit={handleCreate}
                onCancel={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            type="search"
            placeholder="Search by name, email, or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
              {customers.length === 0
                ? 'No customers yet. Add one above or via chat.'
                : 'No customers match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="text-left font-medium px-4 md:px-8 py-3">
                  Name
                </th>
                <th className="text-left font-medium py-3">Email</th>
                <th className="text-left font-medium py-3">Company</th>
                <th className="text-right font-medium px-4 md:px-8 py-3">
                  Last interaction
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-[var(--brand-border)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <td className="px-4 md:px-8 py-3 font-medium">
                    <Link
                      href={`/customers/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-3 text-[var(--text-muted)]">{c.email}</td>
                  <td className="py-3 text-[var(--text-muted)]">
                    {c.company ?? '—'}
                  </td>
                  <td className="px-4 md:px-8 py-3 text-right text-[var(--text-muted)]">
                    {c.lastInteractionAt
                      ? formatRelativeTime(c.lastInteractionAt)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
