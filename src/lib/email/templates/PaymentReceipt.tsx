import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import { Layout } from './Layout'

export type PaymentReceiptProps = {
  customerName: string
  customerLanguage: 'en' | 'es'
  businessName: string
  brandColor: string
  logoUrl: string | null
  amount: number
  lineItems: Array<{ name: string; quantity: number; price: number }>
  paidAt: Date
  transactionId: string // full ID; render only last 4 to the user
}

const COPY = {
  en: {
    preview: (business: string, amount: string) =>
      `${business} received your payment of ${amount}.`,
    headline: 'Payment received',
    thanks: (business: string) =>
      `${business} has received your payment. Thanks for paying on time.`,
    paidOn: (date: string) => `Paid on ${date}`,
    txRef: 'Transaction',
    save: 'Save this email for your records.',
  },
  es: {
    preview: (business: string, amount: string) =>
      `${business} recibió tu pago de ${amount}.`,
    headline: 'Pago recibido',
    thanks: (business: string) =>
      `${business} ha recibido tu pago. Gracias por pagar a tiempo.`,
    paidOn: (date: string) => `Pagado el ${date}`,
    txRef: 'Transacción',
    save: 'Guarda este correo para tus registros.',
  },
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PaymentReceipt({
  customerName,
  customerLanguage,
  businessName,
  brandColor,
  logoUrl,
  amount,
  lineItems,
  paidAt,
  transactionId,
}: PaymentReceiptProps) {
  const t = COPY[customerLanguage]
  const formatted = formatCurrency(amount)
  const greeting =
    customerLanguage === 'es'
      ? `Hola ${customerName},`
      : `Hi ${customerName},`
  const last4 = transactionId.slice(-4)

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
        {t.headline}
      </Heading>
      <Text style={{ color: '#0F172A', fontSize: 15, margin: '16px 0 8px' }}>
        {greeting}
      </Text>
      <Text style={{ color: '#0F172A', fontSize: 15, margin: '0 0 16px' }}>
        {t.thanks(businessName)}
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

      <Text style={{ color: '#475569', fontSize: 13, margin: '16px 0 4px' }}>
        {t.paidOn(formatDate(paidAt))}
      </Text>
      <Text style={{ color: '#475569', fontSize: 13, margin: '0 0 24px' }}>
        {t.txRef}{' '}
        <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>
          &middot;&middot;&middot;{last4}
        </span>
      </Text>

      <Text style={{ color: '#64748B', fontSize: 12, margin: '0' }}>
        {t.save}
      </Text>
    </Layout>
  )
}
