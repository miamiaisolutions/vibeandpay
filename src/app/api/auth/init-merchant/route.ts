import { NextResponse, type NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }
  const idToken = authHeader.slice(7).trim()

  let uid: string
  let email: string | null
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
    email = decoded.email ?? null
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { displayName?: string | null }

  const ref = adminDb.collection('merchants').doc(uid)
  const existing = await ref.get()
  if (existing.exists) {
    return NextResponse.json({ ok: true, alreadyExists: true })
  }

  const fallbackName = email?.split('@')[0] ?? 'merchant'

  await ref.set({
    email: email ?? '',
    displayName: body.displayName?.trim() || fallbackName,
    businessName: '',
    logoUrl: null,
    brandColor: '#7C3AED',
    language: 'en',
    defaultInvoiceTermsDays: 30,
    onboardingComplete: false,
    demoMode: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ ok: true })
}
