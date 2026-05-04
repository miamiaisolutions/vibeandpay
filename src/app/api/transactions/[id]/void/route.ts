import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { voidTransaction } from '@/lib/north/client'
import { getMerchantCredentials } from '@/lib/north/credentials'

const Body = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id: txId } = await params
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const merchantRef = adminDb.collection('merchants').doc(uid)
  const txRef = merchantRef.collection('transactions').doc(txId)
  const txSnap = await txRef.get()
  if (!txSnap.exists) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  const tx = (txSnap.data() ?? {}) as Record<string, unknown>
  const status = String(tx.status ?? '')

  if (status !== 'sent' && status !== 'viewed') {
    return NextResponse.json(
      {
        error: `Voids only apply to pending transactions. This one is ${status}.`,
      },
      { status: 400 },
    )
  }

  // If we have a North transaction ID, attempt the API call. Otherwise
  // (the customer never started paying) we just stop polling and mark voided.
  const northTxId = tx.northTransactionId as string | null
  if (northTxId) {
    const merchantSnap = await merchantRef.get()
    const merchant = (merchantSnap.data() ?? {}) as Record<string, unknown>
    const creds = getMerchantCredentials(merchant)
    if (!creds) {
      return NextResponse.json(
        { error: 'North credentials not set.' },
        { status: 400 },
      )
    }
    try {
      await voidTransaction(creds, northTxId, parsed.data.reason)
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `North void failed: ${err.message}`
              : 'North void failed.',
        },
        { status: 502 },
      )
    }
  }

  await txRef.update({
    status: 'voided',
    pollingActive: false,
    metadata: {
      ...(tx.metadata as Record<string, unknown> | undefined),
      voidedAt: new Date().toISOString(),
      voidReason: parsed.data.reason ?? null,
    },
  })

  await merchantRef.collection('customers').doc(String(tx.customerId)).update({
    lastInteractionAt: FieldValue.serverTimestamp(),
  }).catch(() => {
    /* customer may have been deleted; ignore */
  })

  return NextResponse.json({ ok: true })
}
