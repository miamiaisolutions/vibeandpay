import 'server-only'

const BASE = 'https://checkout.north.com'
const TIMEOUT_MS = 60_000

export type NorthCredentials = {
  apiKey: string
  checkoutId: string
  profileId: string
}

export type NorthProduct = {
  name: string
  quantity: number
  price: number
}

export type CreateSessionResult = {
  token: string
}

export type GetStatusResult = {
  status: 'Open' | 'Verified' | 'Approved' | 'Declined'
  transactionId?: string
  [key: string]: unknown
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    return await fn(ac.signal)
  } finally {
    clearTimeout(timeout)
  }
}

export async function createSession(
  creds: NorthCredentials,
  amount: number,
  products?: NorthProduct[],
): Promise<CreateSessionResult> {
  return withTimeout(async (signal) => {
    const res = await fetch(`${BASE}/api/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutId: creds.checkoutId,
        profileId: creds.profileId,
        amount,
        products,
      }),
      signal,
    })
    if (!res.ok) {
      throw new Error(`North session create failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as CreateSessionResult
  })
}

export async function getStatus(
  creds: NorthCredentials,
  sessionToken: string,
): Promise<GetStatusResult> {
  return withTimeout(async (signal) => {
    const res = await fetch(`${BASE}/api/sessions/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        SessionToken: sessionToken,
        CheckoutId: creds.checkoutId,
        ProfileId: creds.profileId,
      },
      signal,
    })
    if (res.status === 401) {
      throw new Error('North session expired')
    }
    if (!res.ok) {
      throw new Error(`North status check failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as GetStatusResult
  })
}

// =============================================================================
// Refund / Void
// =============================================================================
//
// NOTE: North's published Embedded Checkout docs cover sessions + status; the
// refund and void endpoints below follow North's REST conventions inferred
// from their Sample-JS repo. The wrappers update Firestore unconditionally on
// success/failure inside the calling API route — if the precise endpoint
// shape diverges in production, adjust the URL / payload here only.

export type RefundResult = {
  refundId?: string
  status?: string
  [key: string]: unknown
}

export type VoidResult = {
  status?: string
  [key: string]: unknown
}

export async function refundTransaction(
  creds: NorthCredentials,
  northTransactionId: string,
  amount: number,
  reason?: string,
): Promise<RefundResult> {
  return withTimeout(async (signal) => {
    const res = await fetch(
      `${BASE}/api/transactions/${encodeURIComponent(northTransactionId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          CheckoutId: creds.checkoutId,
          ProfileId: creds.profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, reason }),
        signal,
      },
    )
    if (!res.ok) {
      throw new Error(`North refund failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json().catch(() => ({}))) as RefundResult
  })
}

export async function voidTransaction(
  creds: NorthCredentials,
  northTransactionId: string,
  reason?: string,
): Promise<VoidResult> {
  return withTimeout(async (signal) => {
    const res = await fetch(
      `${BASE}/api/transactions/${encodeURIComponent(northTransactionId)}/void`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          CheckoutId: creds.checkoutId,
          ProfileId: creds.profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
        signal,
      },
    )
    if (!res.ok) {
      throw new Error(`North void failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json().catch(() => ({}))) as VoidResult
  })
}
