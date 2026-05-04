---
name: north-integration
description: Use when implementing or debugging any North Embedded Checkout API call — session creation, status polling, the /pay/[token] payment landing page, polling cron, or webhook handling. Includes endpoint reference, headers, session lifecycle, and test cards.
---

# North Embedded Checkout — Integration Reference

Vibe & Pay uses the **Form integration** of North's Embedded Checkout product. Merchants paste their `PRIVATE_API_KEY`, `CHECKOUT_ID`, and `PROFILE_ID` into Settings; we encrypt them with AES-256-GCM and store per-merchant in `merchants/{uid}`. All North calls happen server-side.

Sample repo we learned from: https://github.com/NorthDevelopers/North-EC-Sample-JS

## Endpoints

| Method | URL | Headers | Body | Notes |
|---|---|---|---|---|
| POST | `https://checkout.north.com/api/sessions` | `Authorization: Bearer {merchantApiKey}` | `{ checkoutId, profileId, amount, products? }` | Returns `{ token }` (a JWT). Session expires in 30 minutes. |
| GET | `https://checkout.north.com/api/sessions/status` | `Authorization: Bearer {merchantApiKey}`, `SessionToken: {token}`, `CheckoutId: {id}`, `ProfileId: {id}` | — | Server-only — rejects browser `Origin` header. Returns `{ status, transactionId?, ... }` |

The `CheckoutId` and `ProfileId` headers on the status endpoint are NOT in North's public docs but ARE required — confirmed by reading their sample repo source. Without them you get a 400 with no useful body.

## Session lifecycle

```
Open ──▶ Verified ──▶ Approved   (success)
                  └─▶ Declined   (failure)
```

- **Open**: session created, payment form not yet submitted.
- **Verified**: form submitted, North is processing.
- **Approved**: payment captured. Map to Vibe & Pay status `paid`.
- **Declined**: payment rejected. Map to status `failed`.

Sessions expire **30 minutes** after creation. Always generate a fresh session per payment attempt — do not reuse tokens across reloads.

## Polling rules

Vibe & Pay uses Vercel Cron + `/api/poll` (every minute) instead of webhooks. North's webhook system requires whitelisting an origin per merchant, which is a non-starter for a multi-tenant hackathon app.

- Minimum 15 seconds between status calls per transaction.
- Stop polling after 24 hours from `sentAt` (set `pollingActive: false`).
- Stop polling on terminal status: `paid`, `failed`, `refunded`, `voided`, `expired`.
- The cron route uses a `collectionGroup` query for `transactions` filtered by `pollingActive == true` — this needs a **collection-group** index, not a single-collection one.
- Authenticate the cron caller via the `Authorization: Bearer ${CRON_SECRET}` header that Vercel Cron sends.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `checkout.mount()` hangs silently, container stays empty | JWT `domain` claim doesn't match `window.location.origin` | Decode the token, check `domain`, ensure North Dashboard's allowed-domains list includes the current origin (Vercel preview URLs included). For local dev, allow `http://localhost:3000`. |
| 401 from `/sessions/status` | Session expired (>30 min) | Create fresh session; surface friendly retry, don't loop. |
| 400 from `/sessions/status` with empty body | Missing `CheckoutId` or `ProfileId` header | Add both headers. |
| Network timeout | North API slow or down | `AbortController` with 60s budget, surface 502 to caller. |
| Apple Pay / Google Pay button missing on `/pay/[token]` | iframe missing `allow="payment"` | Add the attribute. |
| Polling loop never stops on a paid tx | `pollingActive` not set to false on terminal status | Always set in the same write that updates `status`. |

## Wrapper functions (`lib/north/client.ts`)

```ts
type Creds = { apiKey: string; checkoutId: string; profileId: string }

const BASE = 'https://checkout.north.com'

export async function createSession(
  creds: Creds,
  amount: number,
  products?: Array<{ name: string; quantity: number; price: number }>,
) {
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 60_000)
  try {
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
      signal: ac.signal,
    })
    if (!res.ok) throw new Error(`North session create failed: ${res.status}`)
    return (await res.json()) as { token: string }
  } finally {
    clearTimeout(timeout)
  }
}

export async function getStatus(creds: Creds, sessionToken: string) {
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 60_000)
  try {
    const res = await fetch(`${BASE}/api/sessions/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        SessionToken: sessionToken,
        CheckoutId: creds.checkoutId,
        ProfileId: creds.profileId,
      },
      signal: ac.signal,
    })
    if (res.status === 401) throw new Error('North session expired')
    if (!res.ok) throw new Error(`North status check failed: ${res.status}`)
    return (await res.json()) as {
      status: 'Open' | 'Verified' | 'Approved' | 'Declined'
      transactionId?: string
      [k: string]: unknown
    }
  } finally {
    clearTimeout(timeout)
  }
}
```

## Test cards

| Card | Number | Expiry | CVV | ZIP |
|---|---|---|---|---|
| Visa | 4111 1111 1111 1111 | any future MM/YY | any 3-digit | any 5-digit |
| Amex | 3700 000000 00002 | any future MM/YY | any 4-digit | any 5-digit |

Sandbox vs production: same code path, same endpoint host — only the merchant's credentials differ.

## Logging safety

Redact card data before any log call. Any field whose key matches `cardNumber`, `cvv`, `cvc`, `exp`, `expiry`, `pan`, or `track` becomes `[REDACTED]`. Never log the raw `Authorization` header.
