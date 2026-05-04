# Vibe & Pay — Setup

> Goal: from empty folder to "I can sign up and see the app shell" in ~90 minutes.

## Prerequisites

- Node 20+ (`node -v`)
- pnpm (`npm i -g pnpm`) — faster than npm, smaller node_modules
- Vercel CLI (`npm i -g vercel`)
- Firebase CLI (`npm i -g firebase-tools`)
- Git
- VS Code (or your editor)

## 1. Create Accounts (parallel, ~15 min)

- **Anthropic Console** → API key → save
- **Firebase Console** → new project "vibe-and-pay" → enable Auth (email/password) → enable Firestore (production mode, us-central1)
- **Resend** → account → verify a sending domain OR use the testing onboarding email
- **Vercel** → log in via CLI

## 2. Scaffold

```bash
pnpm create next-app@latest vibe-and-pay --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint
cd vibe-and-pay
```

When prompted, accept App Router defaults.

## 3. Install Dependencies

```bash
# Core
pnpm add ai @ai-sdk/anthropic @ai-sdk/react zod

# Firebase
pnpm add firebase firebase-admin

# Email
pnpm add resend @react-email/components @react-email/render

# UI
pnpm add cmdk lucide-react class-variance-authority clsx tailwind-merge
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-accordion

# i18n
pnpm add next-intl

# Storage
pnpm add @vercel/blob

# Rate limiting
pnpm add @upstash/ratelimit @upstash/redis

# Dev
pnpm add -D @types/node
```

## 4. Initialize shadcn

```bash
pnpm dlx shadcn@latest init
# Defaults: TypeScript, Default style, Slate base color, CSS variables
```

Add the components you'll need now (more later):

```bash
pnpm dlx shadcn@latest add button input label textarea card dialog \
  dropdown-menu sheet sidebar tabs accordion command popover \
  select avatar badge separator skeleton sonner
```

## 5. Firebase Setup

In the Firebase Console:
- Project Settings → General → Your apps → Add web app → copy config
- Project Settings → Service accounts → Generate new private key → download JSON

Set rules in Firestore Console (Rules tab):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /merchants/{uid} {
      allow read, write: if request.auth.uid == uid;
      match /{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
    }
    // Public read for /pay/[token] page
    match /merchants/{uid}/transactions/{txId} {
      allow read: if resource.data.northSessionToken != null;
    }
  }
}
```

## 6. Environment Variables

Create `.env.local` (do NOT commit):

```bash
ANTHROPIC_API_KEY=sk-ant-...

# Firebase Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (from service account JSON)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Encryption (run: openssl rand -hex 32)
ENCRYPTION_KEY=

# Resend
RESEND_API_KEY=re_...

# Vercel Blob (get after first deploy + connecting Blob in Vercel dashboard)
BLOB_READ_WRITE_TOKEN=

# Cron secret (any random string)
CRON_SECRET=

# App URL (use http://localhost:3000 for dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: skip Settings entry while developing
DEV_NORTH_API_KEY=
DEV_NORTH_CHECKOUT_ID=
DEV_NORTH_PROFILE_ID=
```

Generate the encryption key:
```bash
openssl rand -hex 32
```

Copy `.env.local` to `.env.local.example` with values blanked out, commit that one.

Make sure `.gitignore` includes:
```
.env.local
.env*.local
.firebase/
firebase-service-account.json
```

## 7. Vercel Project

```bash
vercel link
# Create new project, accept defaults
```

Add cron config in `vercel.json` (root):

```json
{
  "crons": [
    { "path": "/api/poll", "schedule": "*/1 * * * *" }
  ]
}
```

## 8. Smoke Test

```bash
pnpm dev
```

Visit `http://localhost:3000` — Next.js default page should render.

## 9. Build Order

Sequential phases. Each checkpoint should pass before moving on.

### Phase 1 — Auth + settings shell ✅
- [x] Setup (sections 1–8)
- [x] `lib/firebase/{client,admin}.ts` — Firebase init, both sides
- [x] `lib/encryption.ts` — AES-256-GCM
- [x] `(auth)/register`, `(auth)/login` pages
- [x] `(auth)/onboarding` — Demo Mode vs Start Fresh choice
- [x] `lib/seed.ts` — demo data seeder (8 customers + 12 transactions; the 2 sample threads land in Phase 2 once chat UI exists to render them)
- [x] `(app)/layout.tsx` — auth gate + sidebar shell
- [x] `(app)/settings` page — paste North creds, encrypt, save

**Checkpoint:** sign up → onboarding → settings → reload → still logged in, settings persist.

### Phase 2 — First chat round-trip
- [ ] `lib/north/client.ts` — wrapper functions: `createSession`, `getStatus`
- [ ] `lib/ai/{tools,systemPrompt,client}.ts` — Zod schemas, system prompt, Anthropic client
- [ ] `api/chat/route.ts` — AI SDK streaming endpoint, ONE tool only (`createCheckout`)
- [ ] `(app)/chat/page.tsx` — chat UI with `useChat`, basic message rendering
- [ ] `components/chat/ConfirmationCard.tsx` — generic slot-based card
- [ ] `components/chat/ThinkingSpinner.tsx` — rotating playful messages

**Checkpoint:** type `send #checkout to George for $1` → confirmation card appears with editable amount.

### Phase 3 — Golden path end-to-end
- [ ] `app/pay/[token]/page.tsx` — public payment page with embedded checkout
- [ ] `lib/email/templates/CheckoutRequest.tsx` — branded email
- [ ] `lib/email/client.ts` — Resend wrapper
- [ ] Wire confirmation → create North session → save transaction → send email
- [ ] Test end-to-end with North sandbox using real test card

**Checkpoint:** golden path works end-to-end with real North sandbox.

### Phase 4 — List views + polling
- [ ] `cmdk`-powered `AtPicker` and `HashPicker` components
- [ ] `(app)/customers` table + detail page
- [ ] `(app)/transactions` table + side panel
- [ ] `api/poll/route.ts` cron endpoint
- [ ] Real-time Firestore listeners on chat for status changes

**Checkpoint:** every list view works, polling updates transactions, pickers feel smooth.

### Phase 5 — Remaining tools + i18n
- [ ] Remaining tools: `createInvoice`, `createPaymentLink`, `refundTransaction`, `voidTransaction`, `addCustomer`, `updateCustomer`, `getReport`
- [ ] Each rendered through the same `<ConfirmationCard>`
- [ ] Branded `Invoice` and `Receipt` email templates
- [ ] Sidebar threads with auto-titles
- [ ] i18n setup: `next-intl` config, `en.json`, `es.json`, language toggle in settings

### Phase 6 — Marketing + polish
- [ ] Marketing homepage (`/`) — Starfield, Hero, Features, How it works, FAQ
- [ ] Mobile responsive pass on chat, pickers, payment page
- [ ] Demo data quality pass — make customers feel real, balance transaction states
- [ ] Bug fixes from end-to-end test runs
- [ ] Buffer time

## 10. Deploy

```bash
vercel --prod
```

In Vercel dashboard:
- Add all `.env.local` values to Production environment
- Storage tab → connect Vercel Blob → copy `BLOB_READ_WRITE_TOKEN` back to env
- Verify cron is registered (Settings → Crons)

## Common Gotchas

- `FIREBASE_ADMIN_PRIVATE_KEY` newlines: in Vercel env, paste the full key
  including `\n` — Vercel preserves them. In `.env.local`, wrap in double
  quotes so dotenv keeps the `\n` escapes.
- Firestore composite indexes will be auto-suggested in console errors when
  a query needs one — click the link, accept, wait 30s.
- `checkout.mount()` hanging silently almost always means the session's
  configured domain doesn't match the page origin — check the North
  Dashboard's checkout settings and make sure your Vercel preview URL is
  in the allowed domains list (or use Draft Mode which disables the check).
- Vercel free tier limits cron to once per minute on Hobby (matches what we
  need; don't try to schedule sub-minute).
- For local dev, the cron won't fire — call `/api/poll` manually with a
  matching `CRON_SECRET` header to test polling logic.

## Useful Commands

```bash
# Local dev
pnpm dev

# Type check
pnpm tsc --noEmit

# Deploy preview
vercel

# Deploy production
vercel --prod

# Pull env vars from Vercel to local
vercel env pull .env.local

# Generate encryption key
openssl rand -hex 32

# Test polling endpoint locally
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/poll
```
