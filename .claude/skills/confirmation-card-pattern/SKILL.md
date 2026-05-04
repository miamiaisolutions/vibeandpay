---
name: confirmation-card-pattern
description: Use when implementing any AI-triggered write action that requires user confirmation. Covers the ConfirmationCard component pattern used by #checkout, #invoice, #refund, #void, #payment-link, and #customer add/edit tools.
---

# Confirmation Card Pattern

Every AI-triggered write in Vibe & Pay flows through one component, `<ConfirmationCard>`, and one execution model. Get this right once and adding new write tools becomes mechanical.

## Execution model

```
1. User types: "send #checkout to @george for $300"
2. Claude calls createCheckout({ customerId: 'cus_abc', amount: 300 })
3. The tool returns { type: 'createCheckout', data: { ... } }   ← NO side effect
4. UI renders <ConfirmationCard /> populated from data
5. User edits a field (optional) — say, raises amount to $350
6. User clicks Confirm → POST /api/transactions/checkout with final values
7. API route does the actual work:
     - decrypt merchant North creds (server-only)
     - create North session
     - save transaction to Firestore (status='sent', pollingActive=true)
     - send branded email via Resend
     - return result
8. Chat appends a system message: "✓ Checkout sent to George ($350)"
   noting any user edits: "(you raised the amount from $300)"
```

The tool itself NEVER fires the side effect. The Confirm click does. This split is non-negotiable — it's what gives the merchant control and what makes the demo feel safe.

## Component API

```tsx
<ConfirmationCard
  title="Send checkout to George Smith"
  summary="$300.00 via email to george@example.com"
  fields={[
    { label: 'Amount',   name: 'amount',   type: 'currency', editable: true, value: 300 },
    { label: 'Send to',  name: 'email',    type: 'email',    editable: true, value: 'george@example.com' },
    { label: 'Due date', name: 'dueDate',  type: 'date',     editable: true, value: '2026-06-02' },
  ]}
  confirmLabel="Send checkout"
  cancelLabel="Cancel"
  onConfirm={(values) => executeCreateCheckout(values)}
  onCancel={() => markCancelled()}
  secondaryAction={{ label: 'Send via SMS instead', onClick: ... }}  // optional
/>
```

Field types supported: `currency`, `email`, `phone`, `date`, `text`, `textarea`, `select`. Each renders an appropriate input when `editable: true`.

## Edit tracking

When the user changes a field, store an entry in the message's `confirmationCard.edits` array:

```ts
{ field: 'amount', original: 300, edited: 350 }
```

Used for two things:

1. The dev drawer trace, when enabled.
2. Honest post-confirm reporting back to the user: "Sent to george@example.com (you edited from g.smith@example.com)".

## States

- **Pending** (initial): all fields editable, Confirm and Cancel both active.
- **Loading** (after Confirm click): button shows spinner, fields disabled, status text "Creating session…" or similar tool-specific copy.
- **Confirmed**: card collapses to a one-line summary with a checkmark, "Sent to George — $350".
- **Cancelled**: card collapses to a one-line summary, struck-through, muted text.
- **Error** (execute API failed): card stays open, fields keep the user's edits, error message above buttons, Confirm button becomes Retry. Never lose the user's edits on error.

## Data shapes by tool

What the AI tool returns for each write — the `data` payload that hydrates the card.

**`createCheckout`**
```ts
{
  customerId, customerName, customerEmail,
  amount, lineItems: [{ name, quantity, price }],
  sendMethod: 'email',  // future: 'sms'
}
```

**`createInvoice`**
```ts
{
  customerId, customerName, customerEmail,
  amount, lineItems,
  dueDate,             // ISO date string
  termsDays: 15 | 30 | 60,
}
```

**`createPaymentLink`**
```ts
{
  amount, label,
  customerId?, customerName?,
}
```

**`refundTransaction`**
```ts
{
  transactionId, originalAmount, originalCustomerName,
  refundAmount,        // defaults to originalAmount, editable
  reason,
}
```

**`voidTransaction`**
```ts
{
  transactionId, customerName, amount, reason,
}
```

**`addCustomer`**
```ts
{
  name, email, phone?, company?, preferredLanguage: 'en' | 'es',
}
```

**`updateCustomer`**
```ts
{
  customerId,
  diff: [{ field, before, after }, ...],
}
```

The card renders the diff as a compact "Name: Old → New" stack, with each row editable so the user can revise before confirming.

## Naming convention for execute endpoints

Each write tool has a corresponding API route under `app/api/`:

| Tool | Endpoint |
|---|---|
| `createCheckout` | `POST /api/transactions/checkout` |
| `createInvoice` | `POST /api/transactions/invoice` |
| `createPaymentLink` | `POST /api/transactions/payment-link` |
| `refundTransaction` | `POST /api/transactions/[id]/refund` |
| `voidTransaction` | `POST /api/transactions/[id]/void` |
| `addCustomer` | `POST /api/customers` |
| `updateCustomer` | `PATCH /api/customers/[id]` |

Each route validates the body with the same Zod schema the tool used (one source of truth), checks the auth session, decrypts North creds when needed, and performs the work.
