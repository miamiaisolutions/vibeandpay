import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { createSession } from '@/lib/north/client'
import { getMerchantCredentials } from '@/lib/north/credentials'
import { getResend, FROM_ADDRESS } from '@/lib/email/client'
import { InvoiceRequest } from '@/lib/email/templates/InvoiceRequest'

const Body = z.object({
  customerId: z.string().nullable(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  amount: z.number().positive(),
  lineItems: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      }),
    )
    .default([]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  threadId: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }
  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const data = parsed.data

  const merchantRef = adminDb.collection('merchants').doc(uid)
  const merchantSnap = await merchantRef.get()
  if (!merchantSnap.exists) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }
  const merchant = (merchantSnap.data() ?? {}) as Record<string, unknown>
  const creds = getMerchantCredentials(merchant)
  if (!creds) {
    return NextResponse.json(
      {
        error:
          'North credentials not set. Add them in Settings or set DEV_NORTH_* env vars.',
      },
      { status: 400 },
    )
  }

  // Resolve / auto-create the customer
  let customerId = data.customerId
  let customerLanguage: 'en' | 'es' = 'en'
  if (!customerId) {
    const cRef = merchantRef.collection('customers').doc()
    await cRef.set({
      name: data.customerName,
      email: data.customerEmail,
      phone: null,
      company: null,
      notes: 'Auto-created from chat invoice.',
      preferredLanguage: 'en',
      tags: [],
      createdAt: FieldValue.serverTimestamp(),
      lastInteractionAt: FieldValue.serverTimestamp(),
    })
    customerId = cRef.id
  } else {
    const cSnap = await merchantRef.collection('customers').doc(customerId).get()
    if (cSnap.exists && (cSnap.data() ?? {}).preferredLanguage === 'es') {
      customerLanguage = 'es'
    }
  }

  let sessionToken: string
  try {
    const result = await createSession(
      creds,
      data.amount,
      data.lineItems.length > 0 ? data.lineItems : undefined,
    )
    sessionToken = result.token
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `North session create failed: ${err.message}`
            : 'North session create failed.',
      },
      { status: 502 },
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const paymentUrl = `${baseUrl}/pay/${sessionToken}`

  const dueDate = Timestamp.fromDate(new Date(`${data.dueDate}T23:59:59`))

  const txRef = merchantRef.collection('transactions').doc()
  await txRef.set({
    type: 'invoice',
    customerId,
    customerName: data.customerName,
    amount: data.amount,
    currency: 'USD',
    status: 'sent',
    northSessionToken: sessionToken,
    northTransactionId: null,
    northSessionStatus: 'Open',
    paymentUrl,
    lineItems: data.lineItems,
    dueDate,
    sentAt: FieldValue.serverTimestamp(),
    viewedAt: null,
    paidAt: null,
    createdBy: uid,
    threadId: data.threadId ?? null,
    lastPolledAt: null,
    pollingActive: true,
    emailSentTo: data.customerEmail,
    metadata: {},
  })

  await merchantRef.collection('customers').doc(customerId).update({
    lastInteractionAt: FieldValue.serverTimestamp(),
  })

  const businessName =
    (merchant.businessName as string) ||
    (merchant.displayName as string) ||
    'Your merchant'
  const brandColor = (merchant.brandColor as string) || '#7C3AED'
  const logoUrl = (merchant.logoUrl as string | null) ?? null

  const subject =
    customerLanguage === 'es'
      ? `${businessName} te envió una factura`
      : `${businessName} sent you an invoice`

  let emailSent = true
  let emailError: string | null = null
  try {
    const result = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject,
      react: InvoiceRequest({
        customerName: data.customerName,
        customerLanguage,
        businessName,
        brandColor,
        logoUrl,
        amount: data.amount,
        lineItems: data.lineItems,
        dueDate: data.dueDate,
        paymentUrl,
      }),
    })
    if (result?.error) {
      emailSent = false
      emailError = result.error.message ?? 'Resend rejected the send'
      console.error('[invoice email] send failed:', emailError)
    }
  } catch (err) {
    emailSent = false
    emailError = err instanceof Error ? err.message : 'Unknown email error'
    console.error('[invoice email] send threw:', emailError)
  }

  return NextResponse.json({
    ok: true,
    transactionId: txRef.id,
    paymentUrl,
    emailSent,
    emailError,
  })
}
