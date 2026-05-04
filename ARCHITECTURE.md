# Vibe & Pay — Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Streaming, server components, Vercel-native |
| Hosting | Vercel | One-command deploy, cron, preview URLs |
| Auth | Firebase Auth | Email/password, well-known SDK |
| Database | Firestore | Real-time listeners, nested security rules |
| File storage | Vercel Blob | Logo uploads, simple SDK |
| AI | Anthropic Claude Sonnet 4.5 via Vercel AI SDK | Tool use, streaming |
| Email | Resend + React Email | Modern DX, branded templates |
| UI | shadcn/ui + Tailwind | Polished components, easy customization |
| Autocomplete | cmdk | The Linear/Vercel pattern |
| i18n | next-intl | App Router native, type-safe |
| Encryption | Node `crypto` (AES-256-GCM) | Encrypt North creds before Firestore |
| Cron | Vercel Cron | Free, declarative |
| Rate limiting | `@upstash/ratelimit` (free tier) | Protects Anthropic spend |

---

## Folder Structure

```
src/
  app/
    page.tsx                          # marketing homepage
    layout.tsx                        # root layout, fonts, providers

    (auth)/
      login/page.tsx
      register/page.tsx
      onboarding/page.tsx             # demo vs fresh choice

    (app)/
      layout.tsx                      # auth gate, sidebar
      chat/
        page.tsx                      # new thread
        [threadId]/page.tsx
      customers/
        page.tsx
        [customerId]/page.tsx
      transactions/page.tsx
      settings/page.tsx

    pay/[token]/page.tsx              # public payment page

    api/
      chat/route.ts                   # POST: AI SDK streaming chat
      customers/route.ts              # GET, POST
      customers/[id]/route.ts         # GET, PATCH, DELETE
      transactions/route.ts           # GET
      transactions/[id]/route.ts      # GET
      transactions/[id]/refund/route.ts
      transactions/[id]/void/route.ts
      north/
        session/route.ts              # POST: create checkout session
        status/[token]/route.ts       # GET: query status (server-only)
      poll/route.ts                   # cron-triggered
      threads/[id]/title/route.ts     # POST: generate title
      upload/route.ts                 # POST: logo upload

  components/
    chat/
      ChatThread.tsx
      Message.tsx
      MessageInput.tsx
      AtPicker.tsx                    # @customer autocomplete
      HashPicker.tsx                  # #tool autocomplete
      ConfirmationCard.tsx            # generic, slot-based
      ToolStatusLine.tsx              # "✓ Found George Smith"
      ThinkingSpinner.tsx             # rotating playful messages
    customers/
      CustomerTable.tsx
      CustomerForm.tsx
      CustomerDetailPanel.tsx
    transactions/
      TransactionTable.tsx
      TransactionDetailPanel.tsx
      StatusPill.tsx
    settings/
      SettingsForm.tsx
      LogoUploader.tsx
      ColorPicker.tsx
      CredentialsForm.tsx
    pay/
      PaymentLanding.tsx              # the /pay/[token] component
    marketing/
      Hero.tsx
      Starfield.tsx                   # canvas animation
      FeaturesGrid.tsx
      HowItWorks.tsx
      FAQ.tsx
    ui/                               # shadcn components

  lib/
    firebase/
      client.ts                       # browser SDK
      admin.ts                        # server SDK (service account)
      auth.ts                         # auth helpers
    north/
      client.ts                       # fetch wrapper
      types.ts
      session.ts                      # createSession, getStatus
    ai/
      client.ts                       # anthropic provider
      systemPrompt.ts                 # bilingual templates
      tools.ts                        # all tool definitions (Zod)
    encryption.ts                     # AES-256-GCM wrap/unwrap
    email/
      client.ts                       # Resend instance
      templates/                      # React Email components
        Layout.tsx
        CheckoutRequest.tsx
        InvoiceRequest.tsx
        PaymentReceipt.tsx
    seed.ts                           # demo data
    utils.ts

  i18n/
    config.ts
    request.ts
    en.json
    es.json

  types/
    index.ts                          # shared TS types

middleware.ts                         # auth + i18n routing
firestore.rules
firestore.indexes.json
vercel.json                           # cron config
```

---

## Firestore Data Model

All merchant data is nested under `merchants/{uid}` so security rules are
trivial: a user can read/write their own subtree, full stop.

```
merchants/{uid}
  email: string
  displayName: string
  businessName: string
  logoUrl: string | null
  brandColor: string                  # hex, e.g. "#7C3AED"
  language: 'en' | 'es'
  defaultInvoiceTermsDays: 15 | 30 | 60
  northCredentialsCipher: string      # AES-GCM ciphertext (base64)
  northCredentialsIV: string          # IV (base64)
  onboardingComplete: boolean
  demoMode: boolean
  createdAt: Timestamp
  updatedAt: Timestamp

merchants/{uid}/customers/{customerId}
  name: string
  email: string
  phone: string | null
  company: string | null
  notes: string | null
  preferredLanguage: 'en' | 'es'
  tags: string[]
  createdAt: Timestamp
  lastInteractionAt: Timestamp | null

merchants/{uid}/transactions/{txId}
  type: 'checkout' | 'invoice' | 'payment-link' | 'refund' | 'void'
  customerId: string
  customerName: string                # denormalized for table render
  amount: number                      # in dollars (e.g. 300.00)
  currency: 'USD'
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'failed'
        | 'refunded' | 'voided' | 'expired'
  northSessionToken: string | null    # for /pay/[token] route
  northTransactionId: string | null   # after payment (for refunds)
  northSessionStatus: string | null   # 'Open' | 'Verified' | 'Approved' | 'Declined'
  paymentUrl: string | null           # /pay/[token] absolute URL
  lineItems: Array<{ name, quantity, price }>
  dueDate: Timestamp | null           # invoices only
  sentAt: Timestamp
  viewedAt: Timestamp | null
  paidAt: Timestamp | null
  createdBy: string                   # user uid
  threadId: string | null             # which chat thread created it
  lastPolledAt: Timestamp | null
  pollingActive: boolean              # false after 24h or terminal status
  emailSentTo: string                 # snapshot at send time
  metadata: Record<string, any>       # full North response on completion

merchants/{uid}/threads/{threadId}
  title: string                       # Claude-generated after 1st response
  createdAt: Timestamp
  updatedAt: Timestamp
  lastMessagePreview: string
  messageCount: number

merchants/{uid}/threads/{threadId}/messages/{msgId}
  role: 'user' | 'assistant' | 'system'
  content: string                     # text content
  toolCalls: Array<{
    name, input, output, status, latencyMs
  }> | null
  confirmationCard: {                 # rendered as rich card
    type, data, status: 'pending' | 'confirmed' | 'cancelled' | 'edited'
  } | null
  createdAt: Timestamp
```

### Indexes Needed
- `transactions` where `pollingActive == true` orderBy `lastPolledAt`
- `transactions` where `status == 'sent'` orderBy `sentAt desc`
- `transactions` where `customerId == X` orderBy `sentAt desc`
- `customers` orderBy `lastInteractionAt desc`
- `threads` orderBy `updatedAt desc`

### Security Rules (sketch)
```
match /merchants/{uid} {
  allow read, write: if request.auth.uid == uid;
  match /{document=**} {
    allow read, write: if request.auth.uid == uid;
  }
}
```

---

## AI Tool Definitions

All tools defined with Zod schemas; the AI SDK passes them to Claude.

| Tool | Confirmation? | Input | Behavior |
|---|---|---|---|
| `getCustomers` | No | `{ query?: string }` | Filter Firestore by name/email/company |
| `getCustomer` | No | `{ customerId: string }` | Single doc fetch |
| `getTransactions` | No | `{ status?, customerId?, limit? }` | Filter list |
| `getTransaction` | No | `{ transactionId: string }` | Single doc fetch |
| `getReport` | No | `{ period: 'today' \| 'week' \| 'month' }` | Aggregate |
| `addCustomer` | Yes | `{ name, email, phone?, company?, preferredLanguage? }` | Confirmation card with editable fields |
| `updateCustomer` | Yes | `{ customerId, ...patch }` | Confirmation card |
| `createCheckout` | Yes | `{ customerId, amount, lineItems? }` | Card → North session → email |
| `createInvoice` | Yes | `{ customerId, amount, lineItems, dueDate? }` | Card → North session → email |
| `createPaymentLink` | Yes | `{ amount, label?, customerId? }` | Card → reusable URL |
| `refundTransaction` | Yes | `{ transactionId?, customerId? }` | Picker if unspecified, then card |
| `voidTransaction` | Yes | `{ transactionId? }` | Picker if unspecified, then card |

Reads can chain into writes within a single AI turn: AI calls
`getCustomers({ query: 'george' })`, gets George's ID, then proposes
`createCheckout({ customerId: 'cus_abc', amount: 300 })` — but the
`createCheckout` *result* is a confirmation card, not an executed action.
The user clicks Confirm in the UI, which fires a separate API call to
actually execute.

---

## North API Integration

Reuses everything we learned from the sample repo:

- **Base URL:** `https://checkout.north.com`
- **Create session:** `POST /api/sessions` with `Authorization: Bearer
  {merchantApiKey}`, body `{ checkoutId, profileId, amount, products? }`
- **Get status:** `GET /api/sessions/status` with `Authorization`,
  `SessionToken`, `CheckoutId`, `ProfileId` headers (server-side only)
- **All North calls happen server-side**, decrypting merchant creds
  per-request from Firestore
- **Per-merchant credentials** stored encrypted in `merchants/{uid}` doc

---

## Polling Strategy

Vercel Cron triggers `/api/poll` every minute (`vercel.json`):

```json
{ "crons": [{ "path": "/api/poll", "schedule": "*/1 * * * *" }] }
```

Endpoint:
1. Check `CRON_SECRET` header to reject non-cron callers
2. Use Firebase Admin to query (collectionGroup) all transactions where
   `pollingActive == true` and `lastPolledAt < now - 15s`
3. For each, fetch merchant doc, decrypt creds, call North `/sessions/status`
4. Update transaction status if changed; if terminal (`paid`, `failed`,
   `refunded`, `voided`), set `pollingActive: false`
5. If status changed to `paid`, write a system message into the originating
   thread: "✅ [Customer] just paid $[amount]"
6. After 24 hours from `sentAt`, set `pollingActive: false` regardless

---

## Custom Payment Landing (`/pay/[token]`)

Server component fetches transaction by `northSessionToken` (collectionGroup
query, indexed). Renders:

```
┌─────────────────────────────────────┐
│  [Merchant Logo]  Acme Co.          │
├─────────────────────────────────────┤
│                                      │
│       Pay Acme Co.                   │
│       $300.00                        │
│                                      │
│       Consulting (1 × $300.00)       │
│                                      │
│  ┌────────────────────────────────┐ │
│  │                                 │ │
│  │  [Embedded Checkout iframe]     │ │
│  │  via checkout.mount(token,      │ │
│  │  'checkout-container')          │ │
│  │                                 │ │
│  └────────────────────────────────┘ │
│                                      │
│       Powered by Vibe & Pay         │
└─────────────────────────────────────┘
```

The page loads `https://checkout.north.com/checkout.js`, mounts the form
into a div with the session token. On `onPaymentComplete`, redirects to
`/pay/[token]/success` (or `/failure`). Polling picks up the status change
within 60s for the merchant's view.

---

## Encryption

Wrap North credentials with AES-256-GCM, key in `ENCRYPTION_KEY` env var
(32-byte hex string, generated once with `openssl rand -hex 32`).

```ts
// lib/encryption.ts
import crypto from 'node:crypto'

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
const ALGO = 'aes-256-gcm'

export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, KEY, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    cipher: Buffer.concat([ct, tag]).toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decrypt(cipherB64: string, ivB64: string) {
  const data = Buffer.from(cipherB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const ct = data.slice(0, -16)
  const tag = data.slice(-16)
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
```

Stored as `northCredentialsCipher` (base64 cipher+tag) and
`northCredentialsIV` on the merchant doc. Plaintext is the JSON of
`{ apiKey, checkoutId, profileId }`.

---

## Environment Variables

```
# Anthropic
ANTHROPIC_API_KEY=

# Firebase (client-side, NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=          # paste with \n preserved

# Encryption
ENCRYPTION_KEY=                      # openssl rand -hex 32

# Email
RESEND_API_KEY=

# Vercel Blob (for logo uploads)
BLOB_READ_WRITE_TOKEN=

# Vercel Cron protection
CRON_SECRET=

# App URL (for /pay/[token] absolute URLs in emails)
NEXT_PUBLIC_APP_URL=https://vibeandpay.vercel.app

# Optional: dev fallback North creds
DEV_NORTH_API_KEY=
DEV_NORTH_CHECKOUT_ID=
DEV_NORTH_PROFILE_ID=
```

---

## Marketing Homepage Notes

- **Starfield:** HTML canvas, ~200 stars, slow drift, parallax on mouse move.
  Single component (`<Starfield />`), pure JS, no library.
- **Color tokens:** background `#0A0A1F`, surface `#13132A`, accent
  `#7C3AED` (purple), accent-2 `#06B6D4` (cyan), text `#E2E8F0`
- **Type:** Inter for body, JetBrains Mono for code/numbers
- **Hero animation:** typewriter effect on `send #checkout to @george for
  $300` then fade in a confirmation card mock
- **Layout:** Hero → Features grid (4 cards with subtle glow on hover) →
  How it works (3 steps with vertical timeline) → FAQ (accordion) → Footer
- **No pricing section** for v1 (out of scope)

---

## Demo Seed Data

When user picks "Demo Mode" at onboarding:

**Customers (8):**
- Alex Rivera — alex@regularclient.com, "regular weekly client"
- Beth Chen — beth@overdueco.com, "overdue invoice from 45 days ago"
- Carlos Diaz — carlos@instantpay.com, "always pays within an hour", `es`
- Diana Park — diana@newlead.com, "new lead, no transactions yet"
- Elliot Wong — elliot@bigcorp.com, "high-value account"
- Fatima Khan — fatima@startuplife.com, "monthly retainer"
- Gus Müller — gus@onetimer.com, "one-time customer"
- Helen Park — helen@returningcust.com, "returning after 6 months"

**Transactions (12):**
- Mix of paid/sent/overdue/refunded across the customers
- Beth has one `sent` invoice from 45 days ago (overdue)
- Carlos has 3 paid transactions in last month
- Alex has 1 paid this week, 1 sent yesterday
- Elliot has 1 large paid ($2,400)
- One refunded transaction for plot

**Threads (2):**
- "Send invoice to Alex" (completed, 1 confirmation, success)
- "Refund Diana's payment" (mid-conversation example)
