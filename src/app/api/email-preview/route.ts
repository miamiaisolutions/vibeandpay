// TEMPORARY — local preview only, delete before shipping
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { CheckoutRequest } from '@/lib/email/templates/CheckoutRequest'
import { InvoiceRequest } from '@/lib/email/templates/InvoiceRequest'
import { PaymentReceipt } from '@/lib/email/templates/PaymentReceipt'

const SAMPLE = {
  customerName: 'Jane Smith',
  businessName: 'Surf Shop Co.',
  brandColor: '#7C3AED',
  logoUrl: null,
}

const NAV_PAGE = `<!DOCTYPE html>
<html>
<head>
  <title>Email Previews — Vibe &amp; Pay</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { font-family: system-ui, sans-serif; background: #0A0A1F; color: #E2E8F0; padding: 40px 24px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    p  { font-size: 14px; color: #94A3B8; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; max-width: 720px; }
    a {
      display: block; padding: 16px 20px; border-radius: 10px;
      background: #13132A; border: 1px solid #2A2A45;
      color: #E2E8F0; text-decoration: none; font-size: 14px; font-weight: 500;
    }
    a:hover { border-color: #7C3AED; background: #1C1C3A; }
    .lang { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Email template previews</h1>
  <p>Click to open any template. These render exactly what Resend sends.</p>
  <div class="grid">
    <a href="?t=checkout"><div>Checkout Request</div><div class="lang">EN · English</div></a>
    <a href="?t=checkout-es"><div>Checkout Request</div><div class="lang">ES · Español</div></a>
    <a href="?t=invoice"><div>Invoice Request</div><div class="lang">EN · English</div></a>
    <a href="?t=invoice-es"><div>Invoice Request</div><div class="lang">ES · Español</div></a>
    <a href="?t=receipt"><div>Payment Receipt</div><div class="lang">EN · English</div></a>
    <a href="?t=receipt-es"><div>Payment Receipt</div><div class="lang">ES · Español</div></a>
  </div>
</body>
</html>`

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') ?? ''

  if (!t) {
    return new NextResponse(NAV_PAGE, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const lang = t.endsWith('-es') ? ('es' as const) : ('en' as const)
  const base = t.replace(/-es$/, '')

  let html: string

  if (base === 'checkout') {
    html = await render(
      CheckoutRequest({
        ...SAMPLE,
        customerLanguage: lang,
        amount: 128.5,
        lineItems: [
          { name: 'Rash guard', quantity: 2, price: 45 },
          { name: 'Board wax', quantity: 1, price: 38.5 },
        ],
        paymentUrl: 'https://vibe-and-pay.vercel.app/pay/demo',
      }),
    )
  } else if (base === 'invoice') {
    html = await render(
      InvoiceRequest({
        ...SAMPLE,
        customerLanguage: lang,
        amount: 840,
        lineItems: [
          { name: 'Web design', quantity: 1, price: 650 },
          { name: 'Domain registration', quantity: 1, price: 190 },
        ],
        dueDate: '2026-05-31',
        paymentUrl: 'https://vibe-and-pay.vercel.app/pay/demo',
      }),
    )
  } else if (base === 'receipt') {
    html = await render(
      PaymentReceipt({
        ...SAMPLE,
        customerLanguage: lang,
        amount: 128.5,
        lineItems: [
          { name: 'Rash guard', quantity: 2, price: 45 },
          { name: 'Board wax', quantity: 1, price: 38.5 },
        ],
        paidAt: new Date('2026-05-04T14:30:00Z'),
        transactionId: 'pi_3PfakeExampleTxId5678',
      }),
    )
  } else {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
