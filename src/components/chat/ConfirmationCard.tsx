'use client'

import { useMemo, useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type FieldType =
  | 'currency'
  | 'email'
  | 'phone'
  | 'date'
  | 'text'
  | 'textarea'
  | 'select'

export type ConfirmationField =
  | {
      label: string
      name: string
      type: Exclude<FieldType, 'select'>
      editable: boolean
      value: string | number
    }
  | {
      label: string
      name: string
      type: 'select'
      editable: boolean
      value: string
      options: Array<{ label: string; value: string }>
    }

export type ConfirmationStatus =
  | 'pending'
  | 'loading'
  | 'confirmed'
  | 'cancelled'
  | 'error'

export type ConfirmationLineItem = {
  name: string
  quantity: number
  price: number
}

type Props = {
  title: string
  summary?: string
  fields: ConfirmationField[]
  lineItems?: ConfirmationLineItem[]
  confirmLabel: string
  cancelLabel?: string
  status?: ConfirmationStatus
  errorMessage?: string
  onConfirm: (values: Record<string, string | number>) => void
  onCancel?: () => void
  secondaryAction?: { label: string; onClick: () => void }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function ConfirmationCard({
  title,
  summary,
  fields,
  lineItems,
  confirmLabel,
  cancelLabel = 'Cancel',
  status = 'pending',
  errorMessage,
  onConfirm,
  onCancel,
  secondaryAction,
}: Props) {
  const initial = useMemo(() => {
    const out: Record<string, string | number> = {}
    for (const f of fields) out[f.name] = f.value
    return out
  }, [fields])

  const [values, setValues] = useState<Record<string, string | number>>(initial)

  const isFinal = status === 'confirmed' || status === 'cancelled'
  const isLoading = status === 'loading'
  const inputsDisabled = isLoading || isFinal

  function update(name: string, next: string | number) {
    setValues((v) => ({ ...v, [name]: next }))
  }

  if (isFinal) {
    return (
      <Card>
        <CardContent className="py-3 px-4 flex items-center gap-2 text-sm">
          {status === 'confirmed' ? (
            <>
              <Check className="h-4 w-4 text-[var(--success)]" />
              <span>{summary ?? title}</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] line-through">
                {summary ?? title}
              </span>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {summary && <CardDescription>{summary}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {lineItems && lineItems.length > 0 && (
          <div className="rounded-md border border-[var(--brand-border)] bg-[var(--surface-elevated)]/50 divide-y divide-[var(--brand-border)]">
            {lineItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-[var(--text)]">{item.name}</span>
                  {item.quantity > 1 && (
                    <span className="text-[var(--text-muted)]">
                      {' '}
                      × {item.quantity}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[var(--text)]">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        )}
        {fields.map((field) => {
          const id = `cc-${field.name}`
          const value = values[field.name]

          if (!field.editable) {
            return (
              <div key={field.name} className="space-y-1">
                <div className="text-xs text-[var(--text-muted)]">
                  {field.label}
                </div>
                <div className="text-sm font-medium">
                  {field.type === 'currency' && typeof value === 'number'
                    ? formatCurrency(value)
                    : String(value)}
                </div>
              </div>
            )
          }

          if (field.type === 'textarea') {
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={id}>{field.label}</Label>
                <Textarea
                  id={id}
                  value={String(value)}
                  onChange={(e) => update(field.name, e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>
            )
          }

          if (field.type === 'select') {
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={id}>{field.label}</Label>
                <Select
                  value={String(value)}
                  onValueChange={(v) => update(field.name, v ?? '')}
                  disabled={inputsDisabled}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }

          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={id}>{field.label}</Label>
              <Input
                id={id}
                type={
                  field.type === 'currency'
                    ? 'number'
                    : field.type === 'email'
                      ? 'email'
                      : field.type === 'phone'
                        ? 'tel'
                        : field.type === 'date'
                          ? 'date'
                          : 'text'
                }
                inputMode={field.type === 'currency' ? 'decimal' : undefined}
                step={field.type === 'currency' ? '0.01' : undefined}
                value={String(value)}
                onChange={(e) =>
                  update(
                    field.name,
                    field.type === 'currency'
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
                className={
                  field.type === 'currency' || field.type === 'phone'
                    ? 'font-mono'
                    : undefined
                }
                disabled={inputsDisabled}
              />
            </div>
          )
        })}

        {status === 'error' && errorMessage && (
          <div role="alert" className="text-sm text-[var(--danger)]">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {secondaryAction && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={secondaryAction.onClick}
              disabled={isLoading}
            >
              {secondaryAction.label}
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => onConfirm(values)}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === 'error' ? `Retry — ${confirmLabel}` : confirmLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
