import { notFound } from 'next/navigation'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { CheckoutEmbed } from './CheckoutEmbed'

type PayPageParams = { token: string }

type LineItem = {
  name: string
  quantity: number
  price: number
}

type Transaction = {
  amount: number
  status: string
  customerName: string
  emailSentTo: string
  lineItems: LineItem[]
  northSessionToken: string
  paidAt: { toDate: () => Date } | null
}

type Merchant = {
  businessName: string
  displayName: string
  brandColor: string
  logoUrl: string | null
}

async function loadByToken(token: string) {
  const snap = await adminDb
    .collectionGroup('transactions')
    .where('northSessionToken', '==', token)
    .limit(1)
    .get()
  if (snap.empty) return null

  const txDoc = snap.docs[0]
  const uid = txDoc.ref.parent.parent?.id
  if (!uid) return null

  const merchantSnap = await adminDb.collection('merchants').doc(uid).get()
  if (!merchantSnap.exists) return null

  return {
    txId: txDoc.id,
    txRef: txDoc.ref,
    uid,
    tx: txDoc.data() as unknown as Transaction,
    merchant: merchantSnap.data() as unknown as Merchant,
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function PayPage({
  params,
}: {
  params: Promise<PayPageParams>
}) {
  const { token } = await params
  const result = await loadByToken(token)
  if (!result) return notFound()

  const { tx, merchant, txRef } = result

  // Mark first view (best-effort; ignore errors)
  if (tx.status === 'sent') {
    try {
      await txRef.update({
        status: 'viewed',
        viewedAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      console.error('[pay] failed to mark viewed:', err)
    }
  }

  const businessName =
    merchant.businessName || merchant.displayName || 'Your merchant'
  const brandColor = merchant.brandColor || '#7C3AED'
  const totalLabel = formatCurrency(tx.amount)
  const isPaid = tx.status === 'paid'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-xl space-y-6">
          <header
            className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm"
            style={{ borderTop: `4px solid ${brandColor}` }}
          >
            <div className="px-6 py-5 flex items-center gap-3">
              {merchant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={merchant.logoUrl}
                  alt={businessName}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: brandColor }}
                  aria-hidden
                >
                  {businessName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-lg font-semibold">{businessName}</div>
                <div className="text-xs text-slate-500">
                  Secure payment · powered by North
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {isPaid ? (
              <div className="p-6 text-center space-y-3 py-6">
                <div
                  className="mx-auto h-12 w-12 rounded-full flex items-center justify-center text-white text-xl"
                  style={{ backgroundColor: '#10B981' }}
                  aria-hidden
                >
                  ✓
                </div>
                <h1 className="text-2xl font-bold">Payment received</h1>
                <p className="text-slate-600">
                  Thank you, {tx.customerName}. {businessName} has been
                  notified.
                </p>
                <p className="font-mono text-sm text-slate-500">
                  {totalLabel}
                </p>
              </div>
            ) : (
              <>
                <div className="px-6 pt-6">
                  <h1 className="text-2xl font-bold">Pay {businessName}</h1>
                  <p className="mt-1 text-3xl font-bold tracking-tight font-mono">
                    {totalLabel}
                  </p>

                  {tx.lineItems.length > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
                      {tx.lineItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-600">
                            {item.name}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                          </span>
                          <span className="font-mono text-slate-900">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <CheckoutEmbed token={token} />
                </div>
              </>
            )}
          </section>

          <footer className="text-center text-xs text-slate-500">
            Powered by{' '}
            <span className="font-semibold text-slate-700">Vibe &amp; Pay</span>
          </footer>
        </div>
      </main>
    </div>
  )
}
