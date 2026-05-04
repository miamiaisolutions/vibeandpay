'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    checkout?: {
      mount: (
        token: string,
        containerId: string,
        options?: Record<string, unknown>,
      ) => Promise<unknown> | void
      onPaymentComplete?: (cb: (data?: unknown) => void) => void
    }
  }
}

const MOUNT_TIMEOUT_MS = 10_000
const POST_PAYMENT_REFRESH_DELAY_MS = 4_000

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '==='.slice((base64.length + 3) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function CheckoutEmbed({ token }: { token: string }) {
  const router = useRouter()
  const mountedRef = useRef(false)
  const [scriptError, setScriptError] = useState(false)
  const [mountError, setMountError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    // Surface the JWT-domain mismatch loudly — checkout.mount() hangs silently
    // when the session's `domain` claim doesn't match the page origin.
    const payload = decodeJwtPayload(token)
    const expectedDomain =
      typeof payload?.domain === 'string' ? (payload.domain as string) : null
    if (expectedDomain && expectedDomain !== window.location.origin) {
      console.warn(
        `[CheckoutEmbed] JWT domain claim "${expectedDomain}" does not match page origin "${window.location.origin}". checkout.mount() will likely hang. Add this origin to your North dashboard's allowed domains.`,
      )
    }

    async function doMount() {
      const checkout = window.checkout
      if (!checkout?.mount) {
        setMountError(
          'Checkout script loaded but `window.checkout.mount` is missing.',
        )
        return
      }

      // Register the payment-complete callback BEFORE mounting (matches the
      // North sample). When the customer's payment confirms in the iframe,
      // we briefly show "Processing…", give the polling cron a few seconds
      // to flip the tx to `paid`, then refresh the server component — which
      // re-renders into the thank-you state.
      if (typeof checkout.onPaymentComplete === 'function') {
        checkout.onPaymentComplete(() => {
          setProcessing(true)
          setTimeout(() => {
            router.refresh()
          }, POST_PAYMENT_REFRESH_DELAY_MS)
        })
      }

      // Race the mount against a 10s timeout so silent hangs surface as
      // a visible error to the customer instead of an empty container.
      try {
        await Promise.race([
          Promise.resolve(checkout.mount(token, 'checkout-container')),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Payment form didn't load. The merchant may need to allow this domain in their North dashboard.",
                  ),
                ),
              MOUNT_TIMEOUT_MS,
            ),
          ),
        ])
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Mount failed'
        setMountError(msg)
        console.error('[CheckoutEmbed] mount failed:', err)
      }
    }

    const existing = document.querySelector(
      'script[data-north-checkout="true"]',
    ) as HTMLScriptElement | null

    if (existing) {
      doMount()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.north.com/checkout.js'
    script.async = true
    script.dataset.northCheckout = 'true'
    script.onload = () => {
      doMount()
    }
    script.onerror = () => {
      setScriptError(true)
      console.error('Failed to load North checkout.js')
    }
    document.body.appendChild(script)
  }, [token, router])

  return (
    <>
      {/* Force the iframe North injects to fill its parent. Without this it
          gets a ~400px intrinsic height and the form looks squished. */}
      <style>{`
        #checkout-container iframe {
          width: 100% !important;
          height: 760px !important;
          border: 0 !important;
          display: block !important;
        }
        @media (min-width: 768px) {
          #checkout-container iframe { height: 820px !important; }
        }
      `}</style>
      <div
        id="checkout-container"
        className="bg-white"
      />
      {processing && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 text-sm text-slate-600"
        >
          <span
            className="inline-block h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"
            aria-hidden
          />
          Processing your payment…
        </div>
      )}
      {scriptError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          We couldn&apos;t load the secure payment form. Please try again or
          contact the merchant.
        </p>
      )}
      {mountError && !scriptError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {mountError}
        </p>
      )}
    </>
  )
}
