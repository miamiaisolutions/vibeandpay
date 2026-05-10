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
import { Search, Loader2, Plus, Package, Sparkles } from 'lucide-react'
import { auth, db } from '@/lib/firebase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ProductRow = {
  id: string
  name: string
  sku: string
  description: string
  price: number
  type: 'service' | 'physical'
  createdAt: Timestamp | null
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default function ProductsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)

  // Add product form state
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '',
    type: 'service' as 'service' | 'physical',
    description: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'merchants', user.uid, 'products'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(
          snap.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              name: String(data.name ?? ''),
              sku: String(data.sku ?? ''),
              description: String(data.description ?? ''),
              price: Number(data.price ?? 0),
              type: (data.type as 'service' | 'physical') ?? 'service',
              createdAt: (data.createdAt as Timestamp | null) ?? null,
            }
          }),
        )
        setLoading(false)
      },
      (err) => {
        console.error('[products] subscribe error', err)
        setLoading(false)
      },
    )
    return unsub
  }, [user])

  const filtered = useMemo(() => {
    const lc = search.trim().toLowerCase()
    if (!lc) return products
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(lc) ||
        p.sku.toLowerCase().includes(lc)
      )
    })
  }, [products, search])

  async function handleSeedProducts() {
    if (!user) return
    setSeedError(null)
    setSeeding(true)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/products/seed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Seeding failed.')
      }
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Seeding failed.')
    } finally {
      setSeeding(false)
    }
  }

  async function handleAddProduct() {
    if (!user) return
    setFormError(null)
    const price = parseFloat(form.price)
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (isNaN(price) || price <= 0) {
      setFormError('Enter a valid price.')
      return
    }
    setFormSubmitting(true)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          price,
          type: form.type,
          description: form.description.trim(),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Could not add product.')
      }
      setForm({ name: '', sku: '', price: '', type: 'service', description: '' })
      setAddOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add product.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const isEmpty = !loading && products.length === 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="border-b border-[var(--brand-border)] px-4 md:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Products</h1>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add product
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add product</DialogTitle>
                <DialogDescription>
                  Catalog products appear in your <span className="font-mono text-amber-400">&amp;</span> picker in chat.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Name</Label>
                  <Input
                    id="p-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Logo Design"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-price">Price (USD)</Label>
                    <Input
                      id="p-price"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="250"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p-type">Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'service' | 'physical' }))}
                    >
                      <SelectTrigger id="p-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="physical">Physical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-sku">
                    SKU <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="p-sku"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="logo-design"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-desc">
                    Description <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="p-desc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short description shown on invoices…"
                  />
                </div>
                {formError && (
                  <p role="alert" className="text-sm text-[var(--danger)]">{formError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={formSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddProduct} disabled={formSubmitting}>
                    {formSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add product
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {!isEmpty && (
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              type="search"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-5 text-[var(--text-muted)]">
            <Package className="h-10 w-10 opacity-30" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--text)]">No products yet</p>
              <p className="text-xs max-w-xs">
                Add products to your catalog so you can reference them with{' '}
                <span className="font-mono text-amber-400">&amp;Product Name</span> in chat
                and auto-fill line items.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add product
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeedProducts}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Seed sample products
              </Button>
            </div>
            {seedError && (
              <p role="alert" className="text-xs text-[var(--danger)]">{seedError}</p>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
            <p className="text-sm">No products match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="text-left font-medium px-4 md:px-8 py-3">Name</th>
                  <th className="text-left font-medium py-3">SKU</th>
                  <th className="text-left font-medium py-3">Price</th>
                  <th className="text-left font-medium py-3 hidden sm:table-cell">Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-[var(--brand-border)] hover:bg-[var(--surface-elevated)] transition-colors"
                  >
                    <td className="px-4 md:px-8 py-3 font-medium">
                      <span>{p.name}</span>
                      {p.description && (
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-xs mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs text-[var(--text-muted)]">
                      {p.sku || '—'}
                    </td>
                    <td className="py-3 font-mono font-medium">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      <Badge variant={p.type === 'physical' ? 'outline' : 'secondary'}>
                        {p.type}
                      </Badge>
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
