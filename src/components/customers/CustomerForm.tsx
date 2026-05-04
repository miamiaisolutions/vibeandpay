'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CustomerFormValues = {
  name: string
  email: string
  phone: string
  company: string
  notes: string
  preferredLanguage: 'en' | 'es'
}

export const EMPTY_CUSTOMER: CustomerFormValues = {
  name: '',
  email: '',
  phone: '',
  company: '',
  notes: '',
  preferredLanguage: 'en',
}

type Props = {
  initial?: Partial<CustomerFormValues>
  submitLabel: string
  onSubmit: (values: CustomerFormValues) => Promise<void>
  onCancel?: () => void
  showLanguage?: boolean
}

export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  showLanguage = true,
}: Props) {
  const [values, setValues] = useState<CustomerFormValues>({
    ...EMPTY_CUSTOMER,
    ...initial,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cust-name">Name</Label>
        <Input
          id="cust-name"
          required
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cust-email">Email</Label>
          <Input
            id="cust-email"
            type="email"
            required
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cust-phone">Phone</Label>
          <Input
            id="cust-phone"
            type="tel"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cust-company">Company</Label>
        <Input
          id="cust-company"
          value={values.company}
          onChange={(e) => set('company', e.target.value)}
        />
      </div>
      {showLanguage && (
        <div className="space-y-2">
          <Label htmlFor="cust-lang">Email language</Label>
          <Select
            value={values.preferredLanguage}
            onValueChange={(v) =>
              set('preferredLanguage', (v ?? 'en') as 'en' | 'es')
            }
          >
            <SelectTrigger id="cust-lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="cust-notes">Notes</Label>
        <Textarea
          id="cust-notes"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Anything you want to remember about this customer."
          rows={3}
        />
      </div>
      {error && (
        <div role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
