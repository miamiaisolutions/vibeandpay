'use client'

import { Loader2 } from 'lucide-react'
import {
  ConfirmationCard,
  type ConfirmationField,
  type ConfirmationStatus,
} from './ConfirmationCard'

// =============================================================================
// In-flight status copy per tool type
// =============================================================================

const INFLIGHT: Record<string, string> = {
  'tool-getCustomers': 'Looking up customers…',
  'tool-getCustomer': 'Pulling that customer…',
  'tool-getTransactions': 'Pulling transactions…',
  'tool-getTransaction': 'Pulling that transaction…',
  'tool-getReport': 'Crunching numbers…',
  'tool-createCheckout': 'Drafting checkout…',
  'tool-createInvoice': 'Drafting invoice…',
  'tool-createPaymentLink': 'Drafting payment link…',
  'tool-addCustomer': 'Drafting customer…',
  'tool-updateCustomer': 'Drafting customer edit…',
  'tool-refundTransaction': 'Drafting refund…',
  'tool-voidTransaction': 'Drafting void…',
}

const READ_TOOLS = new Set([
  'tool-getCustomers',
  'tool-getCustomer',
  'tool-getTransactions',
  'tool-getTransaction',
  'tool-getReport',
])

const COMPLETED: Record<string, string> = {
  'tool-getCustomers': 'Found',
  'tool-getCustomer': 'Found',
  'tool-getTransactions': 'Looked up transactions',
  'tool-getTransaction': 'Found',
  'tool-getReport': 'Crunched the numbers',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// =============================================================================
// Per-tool card config builders
// =============================================================================

type CheckoutOutput = {
  type: 'createCheckout'
  data: {
    customerId: string | null
    customerName: string
    customerEmail: string
    amount: number
    lineItems: Array<{ name: string; quantity: number; price: number }>
    sendMethod: 'email'
  }
  matched: boolean
}

type InvoiceOutput = {
  type: 'createInvoice'
  data: {
    customerId: string | null
    customerName: string
    customerEmail: string
    amount: number
    lineItems: Array<{ name: string; quantity: number; price: number }>
    dueDate: string
    termsDays: 15 | 30 | 60
  }
  matched: boolean
}

type PaymentLinkOutput = {
  type: 'createPaymentLink'
  data: {
    amount: number
    label: string
    customerId: string | null
    customerName: string | null
  }
}

type AddCustomerOutput = {
  type: 'addCustomer'
  data: {
    name: string
    email: string
    phone: string | null
    company: string | null
    preferredLanguage: 'en' | 'es'
  }
}

type UpdateCustomerOutput = {
  type: 'updateCustomer'
  data: {
    customerId: string
    customerName: string
    diff: Array<{ field: string; before: unknown; after: unknown }>
  }
}

type RefundOutput = {
  type: 'refundTransaction'
  data: {
    transactionId: string
    customerName: string
    originalAmount: number
    refundAmount: number
    reason: string
  }
  found: boolean
}

type VoidOutput = {
  type: 'voidTransaction'
  data: {
    transactionId: string
    customerName: string
    amount: number
    reason: string
  }
  found: boolean
}

export type WriteToolOutput =
  | CheckoutOutput
  | InvoiceOutput
  | PaymentLinkOutput
  | AddCustomerOutput
  | UpdateCustomerOutput
  | RefundOutput
  | VoidOutput

type CardConfig = {
  title: string
  summary: string
  fields: ConfirmationField[]
  confirmLabel: string
}

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]

function buildCardConfig(output: WriteToolOutput): CardConfig {
  switch (output.type) {
    case 'createCheckout': {
      const d = output.data
      return {
        title: `Send checkout to ${d.customerName}`,
        summary: `${formatCurrency(d.amount)}${d.customerEmail ? ` via email to ${d.customerEmail}` : ''}`,
        fields: [
          { label: 'Amount', name: 'amount', type: 'currency', editable: true, value: d.amount },
          { label: 'Send to', name: 'email', type: 'email', editable: true, value: d.customerEmail },
        ],
        confirmLabel: 'Send checkout',
      }
    }
    case 'createInvoice': {
      const d = output.data
      return {
        title: `Send invoice to ${d.customerName}`,
        summary: `${formatCurrency(d.amount)} · due ${d.dueDate}${d.customerEmail ? ` · email to ${d.customerEmail}` : ''}`,
        fields: [
          { label: 'Amount', name: 'amount', type: 'currency', editable: true, value: d.amount },
          { label: 'Send to', name: 'email', type: 'email', editable: true, value: d.customerEmail },
          { label: 'Due date', name: 'dueDate', type: 'date', editable: true, value: d.dueDate },
        ],
        confirmLabel: 'Send invoice',
      }
    }
    case 'createPaymentLink': {
      const d = output.data
      return {
        title: 'Create payment link',
        summary: `${formatCurrency(d.amount)} · ${d.label}${d.customerName ? ` · for ${d.customerName}` : ''}`,
        fields: [
          { label: 'Amount', name: 'amount', type: 'currency', editable: true, value: d.amount },
          { label: 'Label', name: 'label', type: 'text', editable: true, value: d.label },
        ],
        confirmLabel: 'Create link',
      }
    }
    case 'addCustomer': {
      const d = output.data
      return {
        title: `Add ${d.name}`,
        summary: `${d.email}${d.company ? ` · ${d.company}` : ''}`,
        fields: [
          { label: 'Name', name: 'name', type: 'text', editable: true, value: d.name },
          { label: 'Email', name: 'email', type: 'email', editable: true, value: d.email },
          { label: 'Phone', name: 'phone', type: 'phone', editable: true, value: d.phone ?? '' },
          { label: 'Company', name: 'company', type: 'text', editable: true, value: d.company ?? '' },
          {
            label: 'Email language',
            name: 'preferredLanguage',
            type: 'select',
            editable: true,
            value: d.preferredLanguage,
            options: LANGUAGE_OPTIONS,
          },
        ],
        confirmLabel: 'Add customer',
      }
    }
    case 'updateCustomer': {
      const d = output.data
      const summaryParts = d.diff.map(
        (e) => `${e.field}: ${String(e.before ?? '—')} → ${String(e.after ?? '—')}`,
      )
      return {
        title: `Update ${d.customerName || 'customer'}`,
        summary: summaryParts.length > 0 ? summaryParts.join(', ') : 'No changes detected.',
        fields: d.diff.map((entry) => ({
          label: entry.field,
          name: entry.field,
          type: 'text' as const,
          editable: true,
          value: entry.after === null || entry.after === undefined ? '' : String(entry.after),
        })),
        confirmLabel: 'Save changes',
      }
    }
    case 'refundTransaction': {
      const d = output.data
      return {
        title: `Refund ${d.customerName}`,
        summary: `${formatCurrency(d.refundAmount)} of ${formatCurrency(d.originalAmount)}`,
        fields: [
          {
            label: 'Refund amount',
            name: 'amount',
            type: 'currency',
            editable: true,
            value: d.refundAmount,
          },
          {
            label: 'Reason',
            name: 'reason',
            type: 'textarea',
            editable: true,
            value: d.reason,
          },
        ],
        confirmLabel: 'Refund',
      }
    }
    case 'voidTransaction': {
      const d = output.data
      return {
        title: `Void ${d.customerName}'s pending payment`,
        summary: formatCurrency(d.amount),
        fields: [
          {
            label: 'Reason',
            name: 'reason',
            type: 'textarea',
            editable: true,
            value: d.reason,
          },
        ],
        confirmLabel: 'Void',
      }
    }
  }
}

// =============================================================================
// ToolMessage component
// =============================================================================

type ToolPartLike = {
  type: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  toolCallId: string
  output?: unknown
  errorText?: string
}

type Props = {
  part: ToolPartLike
  confirmState: { status: ConfirmationStatus; message?: string } | undefined
  onConfirm: (
    type: WriteToolOutput['type'],
    toolCallId: string,
    output: WriteToolOutput,
    edited: Record<string, string | number>,
  ) => void
  onCancel: (toolCallId: string) => void
}

export function ToolMessage({ part, confirmState, onConfirm, onCancel }: Props) {
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{INFLIGHT[part.type] ?? 'Working…'}</span>
      </div>
    )
  }

  if (part.state === 'output-error') {
    return (
      <div role="alert" className="text-sm text-[var(--danger)]">
        Tool error: {part.errorText ?? 'unknown'}
      </div>
    )
  }

  if (part.state === 'output-available') {
    if (READ_TOOLS.has(part.type)) {
      // Read tools' results are summarized in the AI's next text part —
      // render a tiny success badge here so the merchant sees the tool ran.
      return (
        <div className="text-xs text-[var(--text-muted)]">
          ✓ {COMPLETED[part.type] ?? 'Done'}
        </div>
      )
    }

    const output = part.output as WriteToolOutput | undefined
    if (!output || typeof output !== 'object' || !('type' in output)) {
      return null
    }

    // Special case: updateCustomer with empty diff — show a small note instead of an empty card.
    if (output.type === 'updateCustomer' && output.data.diff.length === 0) {
      return (
        <div className="text-xs text-[var(--text-muted)]">
          ✓ {output.data.customerName} — nothing to change
        </div>
      )
    }
    // Special case: refund/void where the tx wasn't found.
    if (
      (output.type === 'refundTransaction' || output.type === 'voidTransaction') &&
      output.found === false
    ) {
      return (
        <div className="text-sm text-[var(--warning)]">
          Couldn&apos;t find that transaction. Tell me which one — by customer
          and amount, or list recent transactions to pick from.
        </div>
      )
    }

    const config = buildCardConfig(output)
    const state = confirmState ?? { status: 'pending' as ConfirmationStatus }
    const lineItems =
      (output.type === 'createInvoice' || output.type === 'createCheckout') &&
      Array.isArray(output.data.lineItems)
        ? output.data.lineItems
        : undefined

    return (
      <ConfirmationCard
        title={config.title}
        summary={state.status === 'confirmed' && state.message ? state.message : config.summary}
        fields={config.fields}
        lineItems={lineItems}
        confirmLabel={config.confirmLabel}
        status={state.status}
        errorMessage={state.status === 'error' ? state.message : undefined}
        onConfirm={(edited) => onConfirm(output.type, part.toolCallId, output, edited)}
        onCancel={() => onCancel(part.toolCallId)}
      />
    )
  }

  return null
}
