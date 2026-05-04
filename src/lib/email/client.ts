import 'server-only'
import { Resend } from 'resend'

let cached: Resend | null = null

export function getResend(): Resend {
  if (cached) return cached
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY is not set')
  }
  cached = new Resend(key)
  return cached
}

// Resend's testing sender. Sends only deliver to the account-owner's inbox
// until a custom sending domain is verified — fine for hackathon dev.
// Set RESEND_FROM in env once a real domain is configured.
export const FROM_ADDRESS =
  process.env.RESEND_FROM ?? 'Vibe & Pay <onboarding@resend.dev>'
