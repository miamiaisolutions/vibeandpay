import 'server-only'
import { decrypt } from '@/lib/encryption'
import type { NorthCredentials } from './client'

/**
 * Resolve North credentials for a merchant. Prefers per-merchant encrypted
 * credentials in their Firestore doc; falls back to DEV_NORTH_* env vars
 * when those aren't set (useful for sandbox testing without going through
 * the Settings UI). Returns null if neither source is available.
 */
export function getMerchantCredentials(
  merchant: Record<string, unknown>,
): NorthCredentials | null {
  const cipher = merchant.northCredentialsCipher as string | undefined
  const iv = merchant.northCredentialsIV as string | undefined
  if (cipher && iv) {
    try {
      const plaintext = decrypt(cipher, iv)
      return JSON.parse(plaintext) as NorthCredentials
    } catch (err) {
      console.error('[credentials] decrypt failed:', err)
      // Fall through to dev fallback
    }
  }

  const k = process.env.DEV_NORTH_API_KEY
  const c = process.env.DEV_NORTH_CHECKOUT_ID
  const p = process.env.DEV_NORTH_PROFILE_ID
  if (k && c && p) {
    return { apiKey: k, checkoutId: c, profileId: p }
  }

  return null
}
