import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { refundTransaction } from '@/lib/north/client'
import { getMerchantCredentials } from '@/lib/north/credentials'
import { extractNorthTransactionId } from '@/lib/north/extract'

const Body = z.object({
  amount: z.number().positive().optional(),
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

  if (tx.status !== 'paid') {
    return NextResponse.json(
      { error: 'Only paid transactions can be refunded.' },
      { status: 400 },
    )
  }

  const refundAmount = parsed.data.amount ?? Number(tx.amount ?? 0)

  // Seeded demo transactions never went through North (no session token);
  // refund them locally so the demo flow works.
  const sessionToken = tx.northSessionToken as string | null
  if (!sessionToken) {
    await txRef.update({
      status: 'refunded',
      pollingActive: false,
      metadata: {
        ...(tx.metadata as Record<string, unknown> | undefined),
        refundedAt: new Date().toISOString(),
        refundAmount,
        refundReason: parsed.data.reason ?? null,
        refundedLocally: true,
      },
    })
    await merchantRef
      .collection('customers')
      .doc(String(tx.customerId))
      .update({ lastInteractionAt: FieldValue.serverTimestamp() })
      .catch(() => {})
    return NextResponse.json({ ok: true, refundAmount, refundedLocally: true })
  }

  // For real transactions, prefer the captured northTransactionId; otherwise
  // try the snapshotted status response from polling.
  const metadata = (tx.metadata ?? {}) as Record<string, unknown>
  const northTxId =
    (tx.northTransactionId as string | null) ||
    extractNorthTransactionId(metadata.northStatus)

  // No usable North transaction id — refund locally with a warning flag.
  // This keeps demo flows working when North's status response didn't
  // surface the txn id under any expected field.
  if (!northTxId) {
    await txRef.update({
      status: 'refunded',
      pollingActive: false,
      metadata: {
        ...metadata,
        refundedAt: new Date().toISOString(),
        refundAmount,
        refundReason: parsed.data.reason ?? null,
        refundedLocally: true,
        refundedLocallyReason: 'no northTransactionId captured during polling',
      },
    })
    await merchantRef
      .collection('customers')
      .doc(String(tx.customerId))
      .update({ lastInteractionAt: FieldValue.serverTimestamp() })
      .catch(() => {})
    return NextResponse.json({ ok: true, refundAmount, refundedLocally: true })
  }

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
    await refundTransaction(creds, northTxId, refundAmount, parsed.data.reason)
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `North refund failed: ${err.message}`
            : 'North refund failed.',
      },
      { status: 502 },
    )
  }

  await txRef.update({
    status: 'refunded',
    pollingActive: false,
    metadata: {
      ...(tx.metadata as Record<string, unknown> | undefined),
      refundedAt: new Date().toISOString(),
      refundAmount,
      refundReason: parsed.data.reason ?? null,
    },
  })

  await merchantRef.collection('customers').doc(String(tx.customerId)).update({
    lastInteractionAt: FieldValue.serverTimestamp(),
  }).catch(() => {
    /* customer may have been deleted; ignore */
  })

  return NextResponse.json({ ok: true, refundAmount })
}
