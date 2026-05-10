import 'server-only'
import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'

// =============================================================================
// Shared schemas
// =============================================================================

const LineItem = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
})

// =============================================================================
// Read-tool schemas (no confirmation; execute immediately)
// =============================================================================

const GetCustomersInput = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Optional substring filter — matches against name, email, or company (case-insensitive).',
    ),
})

const GetCustomerInput = z.object({
  customerId: z.string().describe('The Firestore customer doc ID.'),
})

const GetTransactionsInput = z.object({
  status: z
    .enum([
      'draft',
      'sent',
      'viewed',
      'paid',
      'failed',
      'refunded',
      'voided',
      'expired',
    ])
    .optional()
    .describe('Filter to one transaction status.'),
  customerId: z
    .string()
    .optional()
    .describe('Filter to one customer (use a customer ID from getCustomers).'),
  limit: z.number().int().positive().max(50).default(20),
})

const GetTransactionInput = z.object({
  transactionId: z.string().describe('The Firestore transaction doc ID.'),
})

const GetReportInput = z.object({
  period: z
    .enum(['today', 'week', 'month'])
    .describe(
      'today = last 24 hours, week = last 7 days, month = last 30 days.',
    ),
})

// =============================================================================
// Write-tool schemas (return confirmation-card payload; NO side effects)
// =============================================================================

const CreateCheckoutInput = z.object({
  customerName: z
    .string()
    .min(1)
    .describe(
      'The customer as the merchant referred to them. Fuzzy-matched against name, email, and company.',
    ),
  amount: z
    .number()
    .positive()
    .describe('Total in dollars as a number, e.g. 300 for $300.'),
  lineItems: z.array(LineItem).optional(),
})

const CreateInvoiceInput = z.object({
  customerName: z.string().min(1),
  amount: z.number().positive(),
  lineItems: z.array(LineItem).optional(),
  dueDate: z
    .string()
    .optional()
    .describe(
      'Optional ISO date YYYY-MM-DD. If omitted, the UI defaults to today + merchant default invoice terms.',
    ),
})

const CreatePaymentLinkInput = z.object({
  amount: z.number().positive(),
  label: z
    .string()
    .optional()
    .describe(
      'Short title for what the link is for, e.g. "consulting deposit". Shown to the customer on the payment page.',
    ),
  customerId: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Optional. If supplied, the link is attributed to that customer; otherwise it is a generic shareable link.',
    ),
})

const AddCustomerInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  preferredLanguage: z.enum(['en', 'es']).default('en'),
})

const UpdateCustomerInput = z.object({
  customerId: z
    .string()
    .describe(
      'Required. Look up the customer first via getCustomers if the merchant referred to them by name.',
    ),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  preferredLanguage: z.enum(['en', 'es']).optional(),
  notes: z.string().optional(),
})

const RefundTransactionInput = z.object({
  transactionId: z
    .string()
    .describe(
      'Required. Use getTransactions first if the merchant referred to the payment by description ("the last payment from Beth").',
    ),
  amount: z
    .number()
    .positive()
    .optional()
    .describe('Optional partial-refund amount; defaults to the full transaction amount.'),
  reason: z.string().optional(),
})

const VoidTransactionInput = z.object({
  transactionId: z
    .string()
    .describe('Required. Voids only apply to pending / not-yet-settled transactions.'),
  reason: z.string().optional(),
})

const GetProductsInput = z.object({
  query: z
    .string()
    .optional()
    .describe('Optional substring filter — matches against name or SKU (case-insensitive).'),
})

const GetProductInput = z.object({
  productId: z.string().describe('The Firestore product doc ID.'),
})

const AddProductInput = z.object({
  name: z.string().min(1).max(120),
  sku: z
    .string()
    .max(60)
    .optional()
    .nullable()
    .describe('Optional short identifier. Auto-generated from name if omitted.'),
  price: z.number().positive().describe('Price in dollars, e.g. 250 for $250.'),
  type: z.enum(['service', 'physical']).describe('Whether this is a service or a physical product.'),
  description: z.string().max(500).optional(),
})

const UpdateProductInput = z.object({
  productId: z
    .string()
    .describe('Required. Look up the product first via getProducts if referred to by name.'),
  name: z.string().min(1).max(120).optional(),
  sku: z.string().max(60).optional().nullable(),
  price: z.number().positive().optional(),
  type: z.enum(['service', 'physical']).optional(),
  description: z.string().max(500).optional(),
})

// =============================================================================
// Result types — chat UI discriminates on `type` for the right card render
// =============================================================================

export type CreateCheckoutResult = {
  type: 'createCheckout'
  data: {
    customerId: string | null
    customerName: string
    customerEmail: string
    amount: number
    lineItems: Array<z.infer<typeof LineItem>>
    sendMethod: 'email'
  }
  matched: boolean
}

export type CreateInvoiceResult = {
  type: 'createInvoice'
  data: {
    customerId: string | null
    customerName: string
    customerEmail: string
    amount: number
    lineItems: Array<z.infer<typeof LineItem>>
    dueDate: string // ISO YYYY-MM-DD
    termsDays: 15 | 30 | 60
  }
  matched: boolean
}

export type CreatePaymentLinkResult = {
  type: 'createPaymentLink'
  data: {
    amount: number
    label: string
    customerId: string | null
    customerName: string | null
  }
}

export type AddCustomerResult = {
  type: 'addCustomer'
  data: {
    name: string
    email: string
    phone: string | null
    company: string | null
    preferredLanguage: 'en' | 'es'
  }
}

export type UpdateCustomerResult = {
  type: 'updateCustomer'
  data: {
    customerId: string
    customerName: string
    diff: Array<{ field: string; before: unknown; after: unknown }>
  }
}

export type RefundTransactionResult = {
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

export type VoidTransactionResult = {
  type: 'voidTransaction'
  data: {
    transactionId: string
    customerName: string
    amount: number
    reason: string
  }
  found: boolean
}

export type AddProductResult = {
  type: 'addProduct'
  data: {
    name: string
    sku: string
    price: number
    type: 'service' | 'physical'
    description: string
  }
}

export type UpdateProductResult = {
  type: 'updateProduct'
  data: {
    productId: string
    productName: string
    diff: Array<{ field: string; before: unknown; after: unknown }>
  }
}

// =============================================================================
// Helpers
// =============================================================================

const SENSITIVE_KEYS = new Set([
  'northCredentialsCipher',
  'northCredentialsIV',
])

function serialize(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k)) continue
    if (v instanceof Timestamp) {
      out[k] = v.toDate().toISOString()
    } else if (v && typeof v === 'object' && 'toDate' in v && typeof (v as Timestamp).toDate === 'function') {
      out[k] = (v as Timestamp).toDate().toISOString()
    } else {
      out[k] = v
    }
  }
  return out
}

async function findCustomerByName(uid: string, name: string) {
  const snap = await adminDb
    .collection('merchants')
    .doc(uid)
    .collection('customers')
    .limit(200)
    .get()
  const lc = name.toLowerCase().trim()
  const match = snap.docs.find((doc) => {
    const data = doc.data()
    const n = String(data.name ?? '').toLowerCase()
    const e = String(data.email ?? '').toLowerCase()
    const c = String(data.company ?? '').toLowerCase()
    return n.includes(lc) || e.includes(lc) || c.includes(lc)
  })
  return match
    ? { id: match.id, data: match.data() as Record<string, unknown> }
    : null
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function periodWindowMs(period: 'today' | 'week' | 'month'): number {
  switch (period) {
    case 'today':
      return 24 * 60 * 60 * 1000
    case 'week':
      return 7 * 24 * 60 * 60 * 1000
    case 'month':
      return 30 * 24 * 60 * 60 * 1000
  }
}

// =============================================================================
// Tool factory
// =============================================================================

export function makeTools(uid: string): ToolSet {
  const merchantRef = adminDb.collection('merchants').doc(uid)

  return {
    // -------- READ TOOLS --------

    getCustomers: tool({
      description:
        'List the merchant\'s customers, optionally filtered by a substring against name / email / company. Use this whenever the merchant asks "who", "find", "look up" a customer, or before proposing a write tool that takes a customerId.',
      inputSchema: GetCustomersInput,
      execute: async ({ query }) => {
        const snap = await merchantRef
          .collection('customers')
          .limit(200)
          .get()
        type Row = Record<string, unknown> & { customerId: string }
        const all: Row[] = snap.docs.map((doc) => ({
          customerId: doc.id,
          ...serialize(doc.data() as Record<string, unknown>),
        }))
        if (!query) return { customers: all.slice(0, 20), total: all.length }
        const lc = query.toLowerCase()
        const matches = all.filter((c) => {
          return (
            String(c.name ?? '').toLowerCase().includes(lc) ||
            String(c.email ?? '').toLowerCase().includes(lc) ||
            String(c.company ?? '').toLowerCase().includes(lc)
          )
        })
        return { customers: matches.slice(0, 20), total: matches.length }
      },
    }),

    getCustomer: tool({
      description:
        'Fetch a single customer by ID, including their 5 most recent transactions.',
      inputSchema: GetCustomerInput,
      execute: async ({ customerId }) => {
        const cSnap = await merchantRef.collection('customers').doc(customerId).get()
        if (!cSnap.exists) return { error: 'Customer not found' }
        const txSnap = await merchantRef
          .collection('transactions')
          .where('customerId', '==', customerId)
          .orderBy('sentAt', 'desc')
          .limit(5)
          .get()
        return {
          customer: {
            customerId,
            ...serialize(cSnap.data() as Record<string, unknown>),
          },
          recentTransactions: txSnap.docs.map((doc) => ({
            transactionId: doc.id,
            ...serialize(doc.data() as Record<string, unknown>),
          })),
        }
      },
    }),

    getTransactions: tool({
      description:
        'List transactions, optionally filtered by status or customer. Returns up to 50 in reverse-chronological order. Use this for questions like "show overdue invoices", "what did Carlos pay last week", "any failures recently".',
      inputSchema: GetTransactionsInput,
      execute: async ({ status, customerId, limit }) => {
        let q = merchantRef
          .collection('transactions')
          .orderBy('sentAt', 'desc') as FirebaseFirestore.Query
        if (status) q = q.where('status', '==', status)
        if (customerId) q = q.where('customerId', '==', customerId)
        const snap = await q.limit(limit).get()
        return {
          transactions: snap.docs.map((doc) => ({
            transactionId: doc.id,
            ...serialize(doc.data() as Record<string, unknown>),
          })),
        }
      },
    }),

    getTransaction: tool({
      description: 'Fetch a single transaction by ID.',
      inputSchema: GetTransactionInput,
      execute: async ({ transactionId }) => {
        const snap = await merchantRef
          .collection('transactions')
          .doc(transactionId)
          .get()
        if (!snap.exists) return { error: 'Transaction not found' }
        return {
          transaction: {
            transactionId,
            ...serialize(snap.data() as Record<string, unknown>),
          },
        }
      },
    }),

    getReport: tool({
      description:
        'Aggregate stats for a given period (today/week/month). Returns total revenue, counts by status, top customers, and overdue count. Use for #report or any "how am I doing" / "this week" / "monthly summary" question.',
      inputSchema: GetReportInput,
      execute: async ({ period }) => {
        const since = Timestamp.fromMillis(Date.now() - periodWindowMs(period))
        const snap = await merchantRef
          .collection('transactions')
          .where('sentAt', '>=', since)
          .orderBy('sentAt', 'desc')
          .get()

        let totalRevenue = 0
        let paidCount = 0
        let sentCount = 0
        let viewedCount = 0
        let failedCount = 0
        let refundedCount = 0
        const customerTotals = new Map<string, { name: string; total: number }>()

        const now = Date.now()
        let overdueCount = 0

        for (const doc of snap.docs) {
          const t = doc.data()
          const status = String(t.status ?? '')
          const amount = Number(t.amount ?? 0)
          const customerId = String(t.customerId ?? '')
          const customerName = String(t.customerName ?? 'Unknown')

          if (status === 'paid') {
            paidCount++
            totalRevenue += amount
            const prev = customerTotals.get(customerId) ?? {
              name: customerName,
              total: 0,
            }
            customerTotals.set(customerId, {
              name: customerName,
              total: prev.total + amount,
            })
          } else if (status === 'sent') {
            sentCount++
            const dueMs = (t.dueDate as Timestamp | undefined)?.toMillis?.()
            if (dueMs && dueMs < now) overdueCount++
          } else if (status === 'viewed') {
            viewedCount++
          } else if (status === 'failed') {
            failedCount++
          } else if (status === 'refunded') {
            refundedCount++
          }
        }

        const topCustomers = [...customerTotals.values()]
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)

        return {
          period,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          transactionCount: snap.size,
          paidCount,
          sentCount,
          viewedCount,
          failedCount,
          refundedCount,
          overdueCount,
          topCustomers,
        }
      },
    }),

    // -------- WRITE TOOLS (return confirmation-card payload) --------

    createCheckout: tool({
      description:
        'Propose a one-time checkout payment to a customer. Use whenever the merchant types #checkout or asks to "send a checkout" / "charge X for Y". Returns a confirmation-card payload — the user clicks Confirm in the UI to actually create the North session and email the customer. NEVER call this for invoices, refunds, or payment links.',
      inputSchema: CreateCheckoutInput,
      execute: async (input): Promise<CreateCheckoutResult> => {
        const match = await findCustomerByName(uid, input.customerName)
        return {
          type: 'createCheckout',
          data: {
            customerId: match?.id ?? null,
            customerName: match ? String(match.data.name) : input.customerName,
            customerEmail: match ? String(match.data.email) : '',
            amount: input.amount,
            lineItems: input.lineItems ?? [],
            sendMethod: 'email',
          },
          matched: Boolean(match),
        }
      },
    }),

    createInvoice: tool({
      description:
        'Propose an invoice to a customer (#invoice). Like createCheckout but the email frames it as an invoice and includes a due date. Use for "send an invoice for X" / "bill them for Y". Returns a confirmation-card payload — user clicks Confirm to fire.',
      inputSchema: CreateInvoiceInput,
      execute: async (input): Promise<CreateInvoiceResult> => {
        const match = await findCustomerByName(uid, input.customerName)

        // Default due date: today + merchant's default terms (or 30 days)
        const merchantSnap = await merchantRef.get()
        const m = (merchantSnap.data() ?? {}) as Record<string, unknown>
        const termsDays = (m.defaultInvoiceTermsDays as 15 | 30 | 60 | undefined) ?? 30
        let dueDate = input.dueDate
        if (!dueDate) {
          const d = new Date()
          d.setDate(d.getDate() + termsDays)
          dueDate = d.toISOString().slice(0, 10)
        }

        return {
          type: 'createInvoice',
          data: {
            customerId: match?.id ?? null,
            customerName: match ? String(match.data.name) : input.customerName,
            customerEmail: match ? String(match.data.email) : '',
            amount: input.amount,
            lineItems: input.lineItems ?? [],
            dueDate,
            termsDays,
          },
          matched: Boolean(match),
        }
      },
    }),

    createPaymentLink: tool({
      description:
        'Propose a reusable payment link not tied to a specific email send (#payment-link). Use when the merchant wants a URL they can paste anywhere — Slack, SMS, Twitter — instead of triggering a send. customerId is optional. Returns a confirmation-card payload.',
      inputSchema: CreatePaymentLinkInput,
      execute: async (input): Promise<CreatePaymentLinkResult> => {
        let customerName: string | null = null
        if (input.customerId) {
          const cSnap = await merchantRef
            .collection('customers')
            .doc(input.customerId)
            .get()
          if (cSnap.exists) {
            customerName = String((cSnap.data() ?? {}).name ?? '')
          }
        }
        return {
          type: 'createPaymentLink',
          data: {
            amount: input.amount,
            label: input.label ?? 'Payment',
            customerId: input.customerId ?? null,
            customerName,
          },
        }
      },
    }),

    addCustomer: tool({
      description:
        'Propose adding a new customer (#customer-add). Returns a confirmation-card payload pre-filled with what the merchant said; they edit and confirm to create.',
      inputSchema: AddCustomerInput,
      execute: async (input): Promise<AddCustomerResult> => ({
        type: 'addCustomer',
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          company: input.company ?? null,
          preferredLanguage: input.preferredLanguage,
        },
      }),
    }),

    refundTransaction: tool({
      description:
        'Propose refunding a past transaction (#refund). Required: transactionId — look it up first via getTransactions if the merchant referred to it by customer or description. Returns a confirmation-card payload; the merchant clicks Confirm to actually refund.',
      inputSchema: RefundTransactionInput,
      execute: async (input): Promise<RefundTransactionResult> => {
        const txSnap = await merchantRef
          .collection('transactions')
          .doc(input.transactionId)
          .get()
        if (!txSnap.exists) {
          return {
            type: 'refundTransaction',
            data: {
              transactionId: input.transactionId,
              customerName: '(not found)',
              originalAmount: 0,
              refundAmount: 0,
              reason: input.reason ?? '',
            },
            found: false,
          }
        }
        const tx = (txSnap.data() ?? {}) as Record<string, unknown>
        const originalAmount = Number(tx.amount ?? 0)
        return {
          type: 'refundTransaction',
          data: {
            transactionId: input.transactionId,
            customerName: String(tx.customerName ?? ''),
            originalAmount,
            refundAmount: input.amount ?? originalAmount,
            reason: input.reason ?? '',
          },
          found: true,
        }
      },
    }),

    voidTransaction: tool({
      description:
        'Propose voiding a pending transaction that has not yet settled (#void). Required: transactionId — look up via getTransactions first. Returns a confirmation-card payload.',
      inputSchema: VoidTransactionInput,
      execute: async (input): Promise<VoidTransactionResult> => {
        const txSnap = await merchantRef
          .collection('transactions')
          .doc(input.transactionId)
          .get()
        if (!txSnap.exists) {
          return {
            type: 'voidTransaction',
            data: {
              transactionId: input.transactionId,
              customerName: '(not found)',
              amount: 0,
              reason: input.reason ?? '',
            },
            found: false,
          }
        }
        const tx = (txSnap.data() ?? {}) as Record<string, unknown>
        return {
          type: 'voidTransaction',
          data: {
            transactionId: input.transactionId,
            customerName: String(tx.customerName ?? ''),
            amount: Number(tx.amount ?? 0),
            reason: input.reason ?? '',
          },
          found: true,
        }
      },
    }),

    updateCustomer: tool({
      description:
        'Propose editing an existing customer (#customer-edit). Required: customerId (look it up first via getCustomers). Returns a confirmation-card payload with the diff of changed fields.',
      inputSchema: UpdateCustomerInput,
      execute: async (input): Promise<UpdateCustomerResult> => {
        const cSnap = await merchantRef
          .collection('customers')
          .doc(input.customerId)
          .get()
        if (!cSnap.exists) {
          // Surface as a non-card result; the AI should ask for clarification.
          return {
            type: 'updateCustomer',
            data: {
              customerId: input.customerId,
              customerName: '(not found)',
              diff: [],
            },
          }
        }
        const before = cSnap.data() ?? {}
        const diff: UpdateCustomerResult['data']['diff'] = []
        const fields: Array<keyof typeof input> = [
          'name',
          'email',
          'phone',
          'company',
          'preferredLanguage',
          'notes',
        ]
        for (const f of fields) {
          if (input[f] === undefined) continue
          const prev = before[f as string] ?? null
          const next = input[f] ?? null
          if (prev !== next) {
            diff.push({ field: f, before: prev, after: next })
          }
        }
        return {
          type: 'updateCustomer',
          data: {
            customerId: input.customerId,
            customerName: String(before.name ?? ''),
            diff,
          },
        }
      },
    }),

    // -------- PRODUCT READ TOOLS --------

    getProducts: tool({
      description:
        'List the merchant\'s products, optionally filtered by name or SKU. Use this when the merchant asks "what products do I have", "show my catalog", or before referencing a &product in a checkout or invoice.',
      inputSchema: GetProductsInput,
      execute: async ({ query }) => {
        const snap = await merchantRef.collection('products').limit(200).get()
        type Row = Record<string, unknown> & { productId: string }
        const all: Row[] = snap.docs.map((doc) => ({
          productId: doc.id,
          ...serialize(doc.data() as Record<string, unknown>),
        }))
        if (!query) return { products: all.slice(0, 20), total: all.length }
        const lc = query.toLowerCase()
        const matches = all.filter((p) => {
          return (
            String(p.name ?? '').toLowerCase().includes(lc) ||
            String(p.sku ?? '').toLowerCase().includes(lc)
          )
        })
        return { products: matches.slice(0, 20), total: matches.length }
      },
    }),

    getProduct: tool({
      description: 'Fetch a single product by ID.',
      inputSchema: GetProductInput,
      execute: async ({ productId }) => {
        const snap = await merchantRef.collection('products').doc(productId).get()
        if (!snap.exists) return { error: 'Product not found' }
        return {
          product: {
            productId,
            ...serialize(snap.data() as Record<string, unknown>),
          },
        }
      },
    }),

    // -------- PRODUCT WRITE TOOLS --------

    addProduct: tool({
      description:
        'Propose adding a new product to the catalog (#product-add). Returns a confirmation-card payload pre-filled with what the merchant said.',
      inputSchema: AddProductInput,
      execute: async (input): Promise<AddProductResult> => ({
        type: 'addProduct',
        data: {
          name: input.name,
          sku: input.sku ?? slugify(input.name),
          price: input.price,
          type: input.type,
          description: input.description ?? '',
        },
      }),
    }),

    updateProduct: tool({
      description:
        'Propose editing an existing product (#product-edit). Required: productId (look it up first via getProducts). Returns a confirmation-card payload with the diff of changed fields.',
      inputSchema: UpdateProductInput,
      execute: async (input): Promise<UpdateProductResult> => {
        const pSnap = await merchantRef.collection('products').doc(input.productId).get()
        if (!pSnap.exists) {
          return {
            type: 'updateProduct',
            data: {
              productId: input.productId,
              productName: '(not found)',
              diff: [],
            },
          }
        }
        const before = pSnap.data() ?? {}
        const diff: UpdateProductResult['data']['diff'] = []
        const fields = ['name', 'sku', 'price', 'type', 'description'] as const
        for (const f of fields) {
          if (input[f] === undefined) continue
          const prev = before[f] ?? null
          const next = (input[f] as unknown) ?? null
          if (prev !== next) {
            diff.push({ field: f, before: prev, after: next })
          }
        }
        return {
          type: 'updateProduct',
          data: {
            productId: input.productId,
            productName: String(before.name ?? ''),
            diff,
          },
        }
      },
    }),
  }
}
