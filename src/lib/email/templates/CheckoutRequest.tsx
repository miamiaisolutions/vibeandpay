import * as React from 'react'
import { Button, Section, Text } from '@react-email/components'
import { Layout } from './Layout'

export type CheckoutLineItem = {
  name: string
  quantity: number
  price: number
}

export type CheckoutRequestProps = {
  customerName: string
  customerLanguage: 'en' | 'es'
  businessName: string
  brandColor: string
  logoUrl: string | null
  amount: number
  lineItems: CheckoutLineItem[]
  paymentUrl: string
}

const COPY = {
  en: {
    preview: (business: string, amount: string) =>
      `${business} sent you a checkout for ${amount}.`,
    subheadline: 'Payment requested',
    intro: (business: string) => `${business} just sent you a payment request.`,
    cta: 'Pay now',
    secure: 'Secured by North. Card details are never seen by the merchant.',
    fallback: (url: string) =>
      `If the button doesn't work, paste this link into your browser: ${url}`,
  },
  es: {
    preview: (business: string, amount: string) =>
      `${business} te envió un cobro por ${amount}.`,
    subheadline: 'Solicitud de pago',
    intro: (business: string) =>
      `${business} acaba de enviarte una solicitud de pago.`,
    cta: 'Pagar ahora',
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

export function CheckoutRequest({
  customerName,
  customerLanguage,
  businessName,
  brandColor,
  logoUrl,
  amount,
  lineItems,
  paymentUrl,
}: CheckoutRequestProps) {
  const t = COPY[customerLanguage]
  const formatted = formatCurrency(amount)
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
        {t.intro(businessName)}
      </Text>

      {/* Amount hero — tinted card, brand top-border, large mono numerals */}
      <Section
        className="amount-block"
        style={{
          backgroundColor: '#FAFBFF',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 12,
          borderTop: `4px solid ${brandColor}`,
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

      {/* Line items — left-border accent, hairline separators */}
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
                borderLeft: `3px solid ${brandColor}`,
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

      {/* CTA — full presence, subtle shadow */}
      <Section style={{ margin: '0 0 28px', textAlign: 'center' }}>
        <Button
          href={paymentUrl}
          style={{
            backgroundColor: brandColor,
            borderRadius: 10,
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            color: '#FFFFFF',
            display: 'inline-block',
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '0.01em',
            padding: '14px 40px',
            textDecoration: 'none',
          }}
        >
          {t.cta}
        </Button>
      </Section>

      {/* Security + fallback link */}
      <Text
        className="text-muted"
        style={{
          color: '#94A3B8',
          fontSize: 12,
          margin: '0 0 6px',
          textAlign: 'center',
        }}
      >
        {t.secure}
      </Text>
      <Text
        className="text-muted"
        style={{
          color: '#CBD5E1',
          fontSize: 11,
          margin: 0,
          textAlign: 'center',
          wordBreak: 'break-all',
        }}
      >
        {t.fallback(paymentUrl)}
      </Text>
    </Layout>
  )
}
