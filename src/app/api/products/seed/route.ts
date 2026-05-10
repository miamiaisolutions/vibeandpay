import { NextResponse, type NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const DEMO_PRODUCTS = [
  {
    id: 'prd_logo',
    name: 'Logo Design',
    sku: 'logo-design',
    description: 'Custom logo design package — 3 concepts, unlimited revisions.',
    price: 250,
    type: 'service',
  },
  {
    id: 'prd_brand',
    name: 'Brand Guidelines',
    sku: 'brand-guidelines',
    description: 'Full brand guidelines document: colors, typography, usage rules.',
    price: 350,
    type: 'service',
  },
  {
    id: 'prd_retainer',
    name: 'Monthly Retainer',
    sku: 'monthly-retainer',
    description: 'Monthly design retainer — up to 20 hours of creative work.',
    price: 1500,
    type: 'service',
  },
  {
    id: 'prd_audit',
    name: 'Website Audit',
    sku: 'website-audit',
    description: 'Full website UX and performance audit with actionable report.',
    price: 95,
    type: 'service',
  },
  {
    id: 'prd_social',
    name: 'Social Media Pack',
    sku: 'social-media-pack',
    description: '10-post social media design pack sized for all major platforms.',
    price: 180,
    type: 'service',
  },
  {
    id: 'prd_brochure',
    name: 'Printed Brochure',
    sku: 'printed-brochure',
    description: 'Tri-fold brochure design + print-ready files (50 qty).',
    price: 220,
    type: 'physical',
  },
] as const

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

  const merchantRef = adminDb.collection('merchants').doc(uid)
  const batch = adminDb.batch()

  for (const p of DEMO_PRODUCTS) {
    const ref = merchantRef.collection('products').doc(p.id)
    batch.set(ref, {
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: p.price,
      type: p.type,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
  return NextResponse.json({ ok: true, count: DEMO_PRODUCTS.length })
}
