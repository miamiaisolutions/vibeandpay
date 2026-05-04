import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).optional(),
  preferredLanguage: z.enum(['en', 'es']).optional(),
})

async function authorize(req: NextRequest): Promise<
  { uid: string } | { errorResponse: NextResponse }
> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Missing bearer token' },
        { status: 401 },
      ),
    }
  }
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    return { uid: decoded.uid }
  } catch {
    return {
      errorResponse: NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 },
      ),
    }
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(req)
  if ('errorResponse' in auth) return auth.errorResponse
  const { id } = await params

  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const ref = adminDb
    .collection('merchants')
    .doc(auth.uid)
    .collection('customers')
    .doc(id)
  const snap = await ref.get()
  if (!snap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const update: Record<string, unknown> = {
    ...patch,
    lastInteractionAt: FieldValue.serverTimestamp(),
  }

  await ref.update(update)

  // Denormalization: keep customerName on this customer's transactions in
  // sync with the customer doc's name (per the schema-guard rule).
  if (typeof patch.name === 'string') {
    const txSnap = await adminDb
      .collection('merchants')
      .doc(auth.uid)
      .collection('transactions')
      .where('customerId', '==', id)
      .get()
    const batch = adminDb.batch()
    for (const doc of txSnap.docs) {
      batch.update(doc.ref, { customerName: patch.name })
    }
    if (!txSnap.empty) await batch.commit()
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(req)
  if ('errorResponse' in auth) return auth.errorResponse
  const { id } = await params

  const ref = adminDb
    .collection('merchants')
    .doc(auth.uid)
    .collection('customers')
    .doc(id)
  const snap = await ref.get()
  if (!snap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await ref.delete()
  return NextResponse.json({ ok: true })
}
