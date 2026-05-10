import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const Body = z.object({
  name: z.string().min(1).max(120),
  sku: z.string().max(60).optional().nullable(),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  type: z.enum(['service', 'physical']),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

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

  const ref = adminDb
    .collection('merchants')
    .doc(uid)
    .collection('products')
    .doc()

  await ref.set({
    name: data.name,
    sku: data.sku ?? slugify(data.name),
    description: data.description ?? '',
    price: data.price,
    type: data.type,
    createdAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ ok: true, productId: ref.id })
}
