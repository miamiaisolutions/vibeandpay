import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const Body = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional(),
  preferredLanguage: z.enum(['en', 'es']).default('en'),
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

  const ref = adminDb
    .collection('merchants')
    .doc(uid)
    .collection('customers')
    .doc()
  await ref.set({
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    company: data.company ?? null,
    notes: data.notes ?? '',
    preferredLanguage: data.preferredLanguage,
    tags: [],
    createdAt: FieldValue.serverTimestamp(),
    lastInteractionAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ ok: true, customerId: ref.id })
}
