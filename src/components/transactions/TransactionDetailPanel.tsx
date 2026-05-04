'use client'

import { ExternalLink } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { StatusPill, type TransactionStatus } from './StatusPill'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/format'

export type TransactionRow = {
  id: string
  type: string
  customerId: string | null
  customerName: string
  amount: number
  status: TransactionStatus
  northSessionToken: string | null
  northTransactionId: string | null
  paymentUrl: string | null
  lineItems: Array<{ name: string; quantity: number; price: number }>
  dueDate: { toDate: () => Date } | null
  sentAt: { toDate: () => Date } | null
  viewedAt: { toDate: () => Date } | null
  paidAt: { toDate: () => Date } | null
  emailSentTo: string
}

export function TransactionDetailPanel({
  tx,
  open,
  onOpenChange,
}: {
  tx: TransactionRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-y-auto"
      >
        {tx && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between gap-3">
                <SheetTitle className="text-2xl font-semibold font-mono">
                  {formatCurrency(tx.amount)}
                </SheetTitle>
                <StatusPill status={tx.status} />
              </div>
              <SheetDescription className="text-left">
                {tx.type[0]?.toUpperCase()}
                {tx.type.slice(1)} · {tx.customerName}
              </SheetDescription>
            </SheetHeader>

            <Separator />

            {tx.lineItems.length > 0 && (
              <>
                <section className="px-6 py-4 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    Line items
                  </div>
                  {tx.lineItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {item.name}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                      </span>
                      <span className="font-mono">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </section>
                <Separator />
              </>
            )}

            <section className="px-6 py-4 space-y-3">
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Timeline
              </div>
              <TimelineRow
                label="Sent"
                value={tx.sentAt ? formatRelativeTime(tx.sentAt) : '—'}
                hint={tx.sentAt ? formatDate(tx.sentAt) : undefined}
              />
              <TimelineRow
                label="Viewed"
                value={tx.viewedAt ? formatRelativeTime(tx.viewedAt) : '—'}
                hint={tx.viewedAt ? formatDate(tx.viewedAt) : undefined}
              />
              <TimelineRow
                label="Paid"
                value={tx.paidAt ? formatRelativeTime(tx.paidAt) : '—'}
                hint={tx.paidAt ? formatDate(tx.paidAt) : undefined}
              />
              {tx.dueDate && (
                <TimelineRow
                  label="Due"
                  value={formatDate(tx.dueDate)}
                />
              )}
            </section>

            <Separator />

            <section className="px-6 py-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Delivery
              </div>
              {tx.emailSentTo && (
                <DetailRow label="Email" value={tx.emailSentTo} />
              )}
              {tx.paymentUrl && (
                <DetailRow
                  label="Payment URL"
                  value={
                    <a
                      href={tx.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent-cyan)] hover:underline inline-flex items-center gap-1"
                    >
                      <span className="truncate max-w-[260px]">
                        {tx.paymentUrl}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
              )}
              {tx.northTransactionId && (
                <DetailRow
                  label="North TX"
                  value={
                    <span className="font-mono text-xs">
                      {tx.northTransactionId}
                    </span>
                  }
                />
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function TimelineRow({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <div className="text-right">
        <div>{value}</div>
        {hint && (
          <div className="text-xs text-[var(--text-muted)]">{hint}</div>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between text-sm gap-3">
      <span className="text-[var(--text-muted)] shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
