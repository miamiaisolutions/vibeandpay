import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

type LayoutProps = {
  preview: string
  brandColor: string
  businessName: string
  logoUrl: string | null
  children: React.ReactNode
}

// @media rules can't live in inline styles — this block handles dark mode
// and mobile-responsive padding. Degrades gracefully in clients that strip <style>.
const responsiveStyles = `
  @media (prefers-color-scheme: dark) {
    .email-body    { background-color: #0D0D1F !important; }
    .email-card    { background-color: #13132A !important; }
    .email-content { background-color: #13132A !important; }
    .email-header  { background-color: #13132A !important; }
    .email-footer  { background-color: rgba(124,58,237,0.12) !important; }
    .text-primary  { color: #E2E8F0 !important; }
    .text-muted    { color: #94A3B8 !important; }
    .amount-block  { background-color: rgba(124,58,237,0.12) !important; border-color: rgba(124,58,237,0.25) !important; }
    .line-items    { background-color: rgba(255,255,255,0.04) !important; border-color: #2A2A45 !important; }
    .divider       { border-color: #2A2A45 !important; }
    .receipt-block { background-color: rgba(16,185,129,0.12) !important; border-color: rgba(16,185,129,0.25) !important; }
  }
  @media only screen and (max-width: 480px) {
    .email-card    { border-radius: 0 !important; }
    .email-content { padding: 8px 16px 28px !important; }
    .email-header  { padding: 18px 16px 12px !important; }
    .email-footer  { padding: 14px 16px 18px !important; }
  }
`

export function Layout({
  preview,
  brandColor,
  businessName,
  logoUrl,
  children,
}: LayoutProps) {
  return (
    <Html lang="en">
      <Head>
        {/* Apple Mail / iOS Mail dark mode support */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{responsiveStyles}</style>
      </Head>
      <Preview>{preview}</Preview>

      <Body
        className="email-body"
        style={{
          backgroundColor: '#F0F2F5',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
          padding: '32px 0',
        }}
      >
        <Container
          className="email-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            margin: '0 auto',
            maxWidth: 560,
            overflow: 'hidden',
          }}
        >
          {/* Brand color top stripe — slightly thicker than before */}
          <div style={{ backgroundColor: brandColor, height: 8 }} />

          {/* Logo + business name */}
          <Section
            className="email-header"
            style={{ padding: '22px 32px 14px' }}
          >
            <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
              {logoUrl ? (
                <Img
                  src={logoUrl}
                  alt={businessName}
                  style={{
                    borderRadius: 8,
                    height: 40,
                    objectFit: 'cover',
                    width: 40,
                  }}
                />
              ) : null}
              <Text
                className="text-primary"
                style={{
                  color: '#0F172A',
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                {businessName}
              </Text>
            </div>
          </Section>

          {/* Template-specific content */}
          <Section
            className="email-content"
            style={{ padding: '4px 32px 32px' }}
          >
            {children}
          </Section>

          {/* "Powered by Vibe & Pay" footer with subtle brand gradient */}
          <Section
            className="email-footer"
            style={{
              borderTop: '1px solid #EAECF0',
              padding: '14px 32px 18px',
              // backgroundColor is the Outlook fallback; background (gradient) overrides it
              // in clients that understand gradients
              backgroundColor: '#F3F0FF',
              background:
                'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(6,182,212,0.05) 100%)',
              textAlign: 'center',
            }}
          >
            <Text
              className="text-muted"
              style={{
                color: '#94A3B8',
                fontSize: 11,
                letterSpacing: '0.02em',
                margin: 0,
              }}
            >
              Powered by{' '}
              <span style={{ color: '#7C3AED', fontWeight: 600 }}>
                Vibe &amp; Pay
              </span>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
