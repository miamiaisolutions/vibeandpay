import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { Layout } from './Layout'

export type InvoiceRequestProps = {
  customerName: string
  customerLanguage: 'en' | 'es'
  businessName: string
  brandColor: string
  logoUrl: string | null
  amount: number
  lineItems: Array<{ name: string; quantity: number; price: number }>
  dueDate: string // ISO YYYY-MM-DD
  paymentUrl: string
}

const COPY = {
  en: {
    preview: (business: string, amount: string) =>
      `${business} sent you an invoice for ${amount}.`,
    headline: (amount: string) => `Invoice — ${amount}`,
    due: (date: string) => `Due ${date}`,
    intro: (business: string) => `${business} sent you an invoice.`,
    cta: 'Pay invoice',
    secure: 'Secured by North. Card details are never seen by the merchant.',
    fallback: (url: string) =>
      `If the button doesn't work, paste this link into your browser: ${url}`,
  },
  es: {
    preview: (business: string, amount: string) =>
      `${business} te envió una factura por ${amount}.`,
    headline: (amount: string) => `Factura — ${amount}`,
    due: (date: string) => `Vence ${date}`,
    intro: (business: string) => `${business} te envió una factura.`,
    cta: 'Pagar factura',
    secure:
      'Procesado por North. El comerciante nunca ve los datos de tu tarjeta.',
    fallback: (url: string) =>
      `Si el botón no funciona, pega este enlace en tu navegador: ${url}`,
  },
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatDueDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InvoiceRequest({
  customerName,
  customerLanguage,
  businessName,
  brandColor,
  logoUrl,
  amount,
  lineItems,
  dueDate,
  paymentUrl,
}: InvoiceRequestProps) {
  const t = COPY[customerLanguage]
  const formatted = formatCurrency(amount)
  const formattedDue = formatDueDate(dueDate)
  const greeting =
    customerLanguage === 'es'
      ? `Hola ${customerName},`
      : `Hi ${customerName},`

  return (
    <Layout
      preview={t.preview(businessName, formatted)}
      brandColor={brandColor}
      businessName={businessName}
      logoUrl={logoUrl}
    >
      <Heading
        as="h1"
        style={{
          color: '#0F172A',
          fontSize: 28,
          fontWeight: 700,
          margin: '8px 0 0',
        }}
      >
        {t.headline(formatted)}
      </Heading>
      <Text style={{ color: '#64748B', fontSize: 14, margin: '4px 0 0' }}>
        {t.due(formattedDue)}
      </Text>
      <Text style={{ color: '#0F172A', fontSize: 15, margin: '16px 0 8px' }}>
        {greeting}
      </Text>
      <Text style={{ color: '#0F172A', fontSize: 15, margin: '0 0 16px' }}>
        {t.intro(businessName)}
      </Text>

      {lineItems.length > 0 && (
        <Section
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            margin: '16px 0',
            padding: '16px',
          }}
        >
          {lineItems.map((item, i) => (
            <div
              key={i}
              style={{
                alignItems: 'center',
                display: 'flex',
                fontSize: 14,
                justifyContent: 'space-between',
                marginBottom: i === lineItems.length - 1 ? 0 : 8,
              }}
            >
              <span style={{ color: '#475569' }}>
                {item.name}
                {item.quantity > 1 ? ` × ${item.quantity}` : ''}
              </span>
              <span style={{ color: '#0F172A', fontWeight: 500 }}>
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </Section>
      )}

      <Section style={{ margin: '24px 0' }}>
        <Button
          href={paymentUrl}
          style={{
            backgroundColor: brandColor,
            borderRadius: 8,
            color: '#FFFFFF',
            display: 'inline-block',
            fontSize: 16,
            fontWeight: 600,
            padding: '12px 24px',
            textDecoration: 'none',
          }}
        >
          {t.cta}
        </Button>
      </Section>

      <Text style={{ color: '#64748B', fontSize: 12, margin: '24px 0 8px' }}>
        {t.secure}
      </Text>
      <Text
        style={{
          color: '#94A3B8',
          fontSize: 11,
          margin: '0',
          wordBreak: 'break-all',
        }}
      >
        {t.fallback(paymentUrl)}
      </Text>
    </Layout>
  )
}
