import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { encrypt } from '@/lib/encryption'

const Body = z.object({
  businessName: z.string().min(1).max(120).optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  language: z.enum(['en', 'es']).optional(),
  defaultInvoiceTermsDays: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  northCredentials: z
    .object({
      apiKey: z.string().min(1),
      checkoutId: z.string().min(1),
      profileId: z.string().min(1),
    })
    .optional(),
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

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (data.businessName !== undefined) update.businessName = data.businessName
  if (data.brandColor !== undefined) update.brandColor = data.brandColor
  if (data.language !== undefined) update.language = data.language
  if (data.defaultInvoiceTermsDays !== undefined)
    update.defaultInvoiceTermsDays = data.defaultInvoiceTermsDays

  if (data.northCredentials) {
    const plaintext = JSON.stringify(data.northCredentials)
    const { cipher, iv } = encrypt(plaintext)
    update.northCredentialsCipher = cipher
    update.northCredentialsIV = iv
  }

  await adminDb.collection('merchants').doc(uid).update(update)

  return NextResponse.json({ ok: true })
}
