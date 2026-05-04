import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { seedDemoData } from '@/lib/seed'

const Body = z.object({
  mode: z.enum(['demo', 'fresh']),
})

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }
  const idToken = authHeader.slice(7).trim()

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { mode } = parsed.data

  let seeded: { customers: number; transactions: number } | null = null
  if (mode === 'demo') {
    seeded = await seedDemoData(uid)
  }

  await adminDb.collection('merchants').doc(uid).update({
    onboardingComplete: true,
    demoMode: mode === 'demo',
    updatedAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ ok: true, mode, seeded })
}
