import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000)
const ts = (d: Date) => Timestamp.fromDate(d)

type SeedCustomer = {
  id: string
  name: string
  email: string
  company: string | null
  notes: string
  preferredLanguage: 'en' | 'es'
  lastInteractionDaysAgo: number | null
}

type SeedTransaction = {
  id: string
  type: 'checkout' | 'invoice' | 'payment-link' | 'refund' | 'void'
  customerId: string
  customerName: string
  amount: number
  status: 'sent' | 'viewed' | 'paid' | 'refunded'
  sentDaysAgo: number
  paidDaysAgo?: number
  viewedHoursAgo?: number
  lineItems?: Array<{ name: string; quantity: number; price: number }>
  dueDaysAhead?: number
}

type SeedProduct = {
  id: string
  name: string
  sku: string
  description: string
  price: number
  type: 'service' | 'physical'
}

const PRODUCTS: SeedProduct[] = [
  {
    id: 'prd_logo',
    name: 'Logo Design',
    sku: 'logo-design',
    description: 'Custom logo design package — 3 concepts, unlimited revisions.',
    price: 250,
    type: 'service',
  },
  {
    id: 'prd_brand',
    name: 'Brand Guidelines',
    sku: 'brand-guidelines',
    description: 'Full brand guidelines document: colors, typography, usage rules.',
    price: 350,
    type: 'service',
  },
  {
    id: 'prd_retainer',
    name: 'Monthly Retainer',
    sku: 'monthly-retainer',
    description: 'Monthly design retainer — up to 20 hours of creative work.',
    price: 1500,
    type: 'service',
  },
  {
    id: 'prd_audit',
    name: 'Website Audit',
    sku: 'website-audit',
    description: 'Full website UX and performance audit with actionable report.',
    price: 95,
    type: 'service',
  },
  {
    id: 'prd_social',
    name: 'Social Media Pack',
    sku: 'social-media-pack',
    description: '10-post social media design pack sized for all major platforms.',
    price: 180,
    type: 'service',
  },
  {
    id: 'prd_brochure',
    name: 'Printed Brochure',
    sku: 'printed-brochure',
    description: 'Tri-fold brochure design + print-ready files (50 qty).',
    price: 220,
    type: 'physical',
  },
]

const CUSTOMERS: SeedCustomer[] = [
  {
    id: 'cus_alex',
    name: 'Alex Rivera',
    email: 'alex@regularclient.com',
    company: 'Regular Client Co',
    notes: 'Regular weekly client. Pays on time.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: 1,
  },
  {
    id: 'cus_beth',
    name: 'Beth Chen',
    email: 'beth@overdueco.com',
    company: 'Overdue Co',
    notes: 'Watch for late payments — last invoice 45 days overdue.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: 45,
  },
  {
    id: 'cus_carlos',
    name: 'Carlos Diaz',
    email: 'carlos@instantpay.com',
    company: 'InstantPay LLC',
    notes: 'Always pays within an hour. Prefers Spanish.',
    preferredLanguage: 'es',
    lastInteractionDaysAgo: 3,
  },
  {
    id: 'cus_diana',
    name: 'Diana Park',
    email: 'diana@newlead.com',
    company: 'New Lead Inc',
    notes: 'New lead, no transactions yet.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: null,
  },
  {
    id: 'cus_elliot',
    name: 'Elliot Wong',
    email: 'elliot@bigcorp.com',
    company: 'BigCorp',
    notes: 'High-value account. Net 30 terms.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: 8,
  },
  {
    id: 'cus_fatima',
    name: 'Fatima Khan',
    email: 'fatima@startuplife.com',
    company: 'StartupLife',
    notes: 'Monthly retainer. $1,500/mo.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: 12,
  },
  {
    id: 'cus_gus',
    name: 'Gus Müller',
    email: 'gus@onetimer.com',
    company: null,
    notes: 'One-time customer.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: 60,
  },
  {
    id: 'cus_helen',
    name: 'Helen Park',
    email: 'helen@returningcust.com',
    company: 'Returning Co',
    notes: 'Returning after 6 months.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: 5,
  },
  {
    id: 'cus_george',
    name: 'George Smith',
    email: 'george@example.com',
    company: 'Smith Consulting',
    notes: 'Common test target — used in the demo script.',
    preferredLanguage: 'en',
    lastInteractionDaysAgo: 7,
  },
]

const TRANSACTIONS: SeedTransaction[] = [
  // Alex — paid this week, sent yesterday
  {
    id: 'tx_alex_paid',
    type: 'checkout',
    customerId: 'cus_alex',
    customerName: 'Alex Rivera',
    amount: 480,
    status: 'paid',
    sentDaysAgo: 4,
    paidDaysAgo: 4,
    lineItems: [{ name: 'Weekly retainer', quantity: 1, price: 480 }],
  },
  {
    id: 'tx_alex_sent',
    type: 'checkout',
    customerId: 'cus_alex',
    customerName: 'Alex Rivera',
    amount: 480,
    status: 'sent',
    sentDaysAgo: 1,
    viewedHoursAgo: 18,
    lineItems: [{ name: 'Weekly retainer', quantity: 1, price: 480 }],
  },
  // Beth — overdue invoice from 45 days ago
  {
    id: 'tx_beth_overdue',
    type: 'invoice',
    customerId: 'cus_beth',
    customerName: 'Beth Chen',
    amount: 1240,
    status: 'sent',
    sentDaysAgo: 45,
    dueDaysAhead: -15,
    lineItems: [{ name: 'Q1 consulting', quantity: 1, price: 1240 }],
  },
  // Carlos — 3 paid in last month
  {
    id: 'tx_carlos_1',
    type: 'checkout',
    customerId: 'cus_carlos',
    customerName: 'Carlos Diaz',
    amount: 220,
    status: 'paid',
    sentDaysAgo: 28,
    paidDaysAgo: 28,
    lineItems: [{ name: 'Logo refresh', quantity: 1, price: 220 }],
  },
  {
    id: 'tx_carlos_2',
    type: 'checkout',
    customerId: 'cus_carlos',
    customerName: 'Carlos Diaz',
    amount: 340,
    status: 'paid',
    sentDaysAgo: 14,
    paidDaysAgo: 14,
    lineItems: [
      { name: 'Brand guidelines doc', quantity: 1, price: 280 },
      { name: 'Color palette tokens', quantity: 1, price: 60 },
    ],
  },
  {
    id: 'tx_carlos_3',
    type: 'checkout',
    customerId: 'cus_carlos',
    customerName: 'Carlos Diaz',
    amount: 180,
    status: 'paid',
    sentDaysAgo: 3,
    paidDaysAgo: 3,
    lineItems: [{ name: 'Social media banner pack', quantity: 1, price: 180 }],
  },
  // Elliot — one big paid
  {
    id: 'tx_elliot_big',
    type: 'invoice',
    customerId: 'cus_elliot',
    customerName: 'Elliot Wong',
    amount: 2400,
    status: 'paid',
    sentDaysAgo: 22,
    paidDaysAgo: 8,
    lineItems: [
      { name: 'Annual platform license', quantity: 1, price: 2000 },
      { name: 'Onboarding setup', quantity: 1, price: 400 },
    ],
  },
  // Fatima — recent retainer
  {
    id: 'tx_fatima_retainer',
    type: 'invoice',
    customerId: 'cus_fatima',
    customerName: 'Fatima Khan',
    amount: 1500,
    status: 'paid',
    sentDaysAgo: 12,
    paidDaysAgo: 11,
    lineItems: [{ name: 'Monthly retainer', quantity: 1, price: 1500 }],
  },
  // Gus — one-off, paid long ago
  {
    id: 'tx_gus_oneoff',
    type: 'checkout',
    customerId: 'cus_gus',
    customerName: 'Gus Müller',
    amount: 95,
    status: 'paid',
    sentDaysAgo: 60,
    paidDaysAgo: 60,
    lineItems: [{ name: 'Site audit', quantity: 1, price: 95 }],
  },
  // Helen — returning customer, recent paid
  {
    id: 'tx_helen_return',
    type: 'checkout',
    customerId: 'cus_helen',
    customerName: 'Helen Park',
    amount: 320,
    status: 'paid',
    sentDaysAgo: 5,
    paidDaysAgo: 5,
    lineItems: [{ name: 'Reactivation strategy session', quantity: 1, price: 320 }],
  },
  // One refund for plot
  {
    id: 'tx_helen_refund',
    type: 'refund',
    customerId: 'cus_helen',
    customerName: 'Helen Park',
    amount: 50,
    status: 'refunded',
    sentDaysAgo: 4,
    paidDaysAgo: 4,
    lineItems: [{ name: 'Refund — duplicate charge', quantity: 1, price: 50 }],
  },
  // One viewed-but-unpaid
  {
    id: 'tx_alex_pending',
    type: 'invoice',
    customerId: 'cus_alex',
    customerName: 'Alex Rivera',
    amount: 75,
    status: 'viewed',
    sentDaysAgo: 2,
    viewedHoursAgo: 6,
    dueDaysAhead: 13,
    lineItems: [{ name: 'Late-night fix', quantity: 1, price: 75 }],
  },
]

export async function seedDemoData(uid: string): Promise<{
  customers: number
  transactions: number
  products: number
}> {
  const merchantRef = adminDb.collection('merchants').doc(uid)
  const batch = adminDb.batch()

  for (const p of PRODUCTS) {
    const ref = merchantRef.collection('products').doc(p.id)
    batch.set(ref, {
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: p.price,
      type: p.type,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  for (const c of CUSTOMERS) {
    const ref = merchantRef.collection('customers').doc(c.id)
    batch.set(ref, {
      name: c.name,
      email: c.email,
      phone: null,
      company: c.company,
      notes: c.notes,
      preferredLanguage: c.preferredLanguage,
      tags: [],
      createdAt: FieldValue.serverTimestamp(),
      lastInteractionAt:
        c.lastInteractionDaysAgo === null
          ? null
          : ts(daysAgo(c.lastInteractionDaysAgo)),
    })
  }

  for (const tx of TRANSACTIONS) {
    const ref = merchantRef.collection('transactions').doc(tx.id)
    const sentAt = ts(daysAgo(tx.sentDaysAgo))
    const viewedAt = tx.viewedHoursAgo ? ts(hoursAgo(tx.viewedHoursAgo)) : null
    const paidAt = tx.paidDaysAgo !== undefined ? ts(daysAgo(tx.paidDaysAgo)) : null
    const dueDate =
      tx.dueDaysAhead !== undefined ? ts(daysAgo(-tx.dueDaysAhead)) : null

    batch.set(ref, {
      type: tx.type,
      customerId: tx.customerId,
      customerName: tx.customerName,
      amount: tx.amount,
      currency: 'USD',
      status: tx.status,
      northSessionToken: null,
      northTransactionId: null,
      northSessionStatus: null,
      paymentUrl: null,
      lineItems: tx.lineItems ?? [],
      dueDate,
      sentAt,
      viewedAt,
      paidAt,
      createdBy: uid,
      threadId: null,
      lastPolledAt: null,
      pollingActive: false,
      emailSentTo: '',
      metadata: {},
    })
  }

  await batch.commit()
  return { customers: CUSTOMERS.length, transactions: TRANSACTIONS.length, products: PRODUCTS.length }
}
