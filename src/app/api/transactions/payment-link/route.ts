import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { createSession } from '@/lib/north/client'
import { getMerchantCredentials } from '@/lib/north/credentials'

const Body = z.object({
  amount: z.number().positive(),
  label: z.string().min(1).max(120).default('Payment'),
  customerId: z.string().nullable().optional(),
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
  const { amount, label, customerId, threadId } = parsed.data

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

  let customerName: string | null = null
  if (customerId) {
    const cSnap = await merchantRef.collection('customers').doc(customerId).get()
    if (cSnap.exists) {
      customerName = String((cSnap.data() ?? {}).name ?? '')
    }
  }

  let sessionToken: string
  try {
    const result = await createSession(creds, amount, [
      { name: label, quantity: 1, price: amount },
    ])
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

  const txRef = merchantRef.collection('transactions').doc()
  await txRef.set({
    type: 'payment-link',
    customerId: customerId ?? null,
    customerName: customerName ?? label,
    amount,
    currency: 'USD',
    status: 'sent',
    northSessionToken: sessionToken,
    northTransactionId: null,
    northSessionStatus: 'Open',
    paymentUrl,
    lineItems: [{ name: label, quantity: 1, price: amount }],
    dueDate: null,
    sentAt: FieldValue.serverTimestamp(),
    viewedAt: null,
    paidAt: null,
    createdBy: uid,
    threadId: threadId ?? null,
    lastPolledAt: null,
    pollingActive: true,
    emailSentTo: '',
    metadata: { label },
  })

  return NextResponse.json({
    ok: true,
    transactionId: txRef.id,
    paymentUrl,
  })
}
