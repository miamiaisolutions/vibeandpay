import { cn } from '@/lib/utils'

export type TransactionStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'voided'
  | 'expired'
  | 'overdue'

const STYLES: Record<TransactionStatus, string> = {
  draft: 'bg-[var(--surface-elevated)] text-[var(--text-muted)]',
  sent: 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]',
  viewed: 'bg-[var(--accent-cyan)]/25 text-[var(--accent-cyan)]',
  paid: 'bg-[var(--success)]/15 text-[var(--success)]',
  failed: 'bg-[var(--danger)]/15 text-[var(--danger)]',
  refunded: 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
  voided: 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
  expired: 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
  overdue: 'bg-[var(--warning)]/15 text-[var(--warning)]',
}

const LABELS: Record<TransactionStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  voided: 'Voided',
  expired: 'Expired',
  overdue: 'Overdue',
}

export function StatusPill({
  status,
  className,
}: {
  status: TransactionStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  )
}
