import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  sku: z.string().max(60).optional().nullable(),
  description: z.string().max(500).optional(),
  price: z.number().positive().optional(),
  type: z.enum(['service', 'physical']).optional(),
})

export async function PATCH(
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

  const { id } = await params
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const patch: Record<string, unknown> = {}
  const data = parsed.data
  if (data.name !== undefined) patch.name = data.name
  if (data.sku !== undefined) patch.sku = data.sku
  if (data.description !== undefined) patch.description = data.description
  if (data.price !== undefined) patch.price = data.price
  if (data.type !== undefined) patch.type = data.type

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const ref = adminDb.collection('merchants').doc(uid).collection('products').doc(id)
  const snap = await ref.get()
  if (!snap.exists) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  await ref.update(patch)
  return NextResponse.json({ ok: true })
}
