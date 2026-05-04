import * as React from 'react'
import { Section, Text } from '@react-email/components'
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
    subheadline: 'Payment received',
    thanks: (business: string) =>
      `${business} has received your payment. Thanks for paying on time.`,
    paidOn: (date: string) => `Paid on ${date}`,
    txRef: 'Transaction ref',
    save: 'Save this email for your records.',
  },
  es: {
    preview: (business: string, amount: string) =>
      `${business} recibió tu pago de ${amount}.`,
    subheadline: 'Pago recibido',
    thanks: (business: string) =>
      `${business} ha recibido tu pago. Gracias por pagar a tiempo.`,
    paidOn: (date: string) => `Pagado el ${date}`,
    txRef: 'Ref. transacción',
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
      {/* ✓ Checkmark — prominent success indicator */}
      <div style={{ margin: '4px 0 20px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: '#10B981',
            borderRadius: '50%',
            color: '#FFFFFF',
            display: 'inline-block',
            fontSize: 26,
            fontWeight: 700,
            height: 56,
            lineHeight: '56px',
            textAlign: 'center',
            width: 56,
          }}
        >
          ✓
        </div>
      </div>

      {/* Greeting */}
      <Text
        className="text-primary"
        style={{ color: '#0F172A', fontSize: 15, margin: '0 0 2px' }}
      >
        {greeting}
      </Text>
      <Text
        className="text-muted"
        style={{ color: '#64748B', fontSize: 15, margin: '0 0 24px' }}
      >
        {t.thanks(businessName)}
      </Text>

      {/* Amount block — success-tinted, no CTA (it's a receipt) */}
      <Section
        className="receipt-block"
        style={{
          backgroundColor: '#F0FDF8',
          border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: 12,
          borderTop: '4px solid #10B981',
          margin: '0 0 24px',
          padding: '24px 24px 20px',
          textAlign: 'center',
        }}
      >
        <Text
          className="text-muted"
          style={{
            color: '#94A3B8',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            margin: '0 0 10px',
            textTransform: 'uppercase',
          }}
        >
          {t.subheadline}
        </Text>
        <Text
          className="text-primary"
          style={{
            color: '#0F172A',
            fontFamily:
              '"SF Mono", "JetBrains Mono", "Courier New", Courier, monospace',
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: '1.1',
            margin: 0,
          }}
        >
          {formatted}
        </Text>
      </Section>

      {/* Line items — left-border in success green */}
      {lineItems.length > 0 && (
        <Section
          className="line-items"
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #EAECF0',
            borderRadius: 10,
            margin: '0 0 24px',
            overflow: 'hidden',
          }}
        >
          {lineItems.map((item, i) => (
            <div
              key={i}
              style={{
                alignItems: 'center',
                borderBottom:
                  i === lineItems.length - 1 ? 'none' : '1px solid #EEF2F7',
                borderLeft: '3px solid #10B981',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '11px 16px',
              }}
            >
              <span
                className="text-muted"
                style={{ color: '#475569', fontSize: 14 }}
              >
                {item.name}
                {item.quantity > 1 ? ` × ${item.quantity}` : ''}
              </span>
              <span
                className="text-primary"
                style={{
                  color: '#0F172A',
                  fontFamily:
                    '"SF Mono", "JetBrains Mono", "Courier New", Courier, monospace',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Metadata: paid date + masked transaction ID */}
      <div
        style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #EAECF0',
          borderRadius: 10,
          margin: '0 0 24px',
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span className="text-muted" style={{ color: '#94A3B8', fontSize: 12 }}>
            {t.paidOn(formatDate(paidAt))}
          </span>
        </div>
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
          <span className="text-muted" style={{ color: '#94A3B8', fontSize: 12 }}>
            {t.txRef}
          </span>
          <span
            className="text-primary"
            style={{
              color: '#0F172A',
              fontFamily:
                '"SF Mono", "JetBrains Mono", "Courier New", Courier, monospace',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            {'•••• •••• '}
            {last4}
          </span>
        </div>
      </div>

      {/* Record-keeping note */}
      <Text
        className="text-muted"
        style={{
          color: '#94A3B8',
          fontSize: 12,
          margin: 0,
          textAlign: 'center',
        }}
      >
        {t.save}
      </Text>
    </Layout>
  )
}
