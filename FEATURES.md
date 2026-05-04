# Vibe & Pay — Features

> AI copilot for North merchants. Chat-first interface where merchants use
> hashtags (`#checkout`, `#invoice`, etc.) and `@mentions` to send payments,
> manage customers, and run reports.

> Status legend: `[x]` = built and verified, `[ ]` = not built yet.
> Partial deliveries note what's missing in parentheses.

## Deployment status

- [x] Live in production at **https://vibe-and-pay.vercel.app**
- [x] Vercel Pro plan, per-minute cron registered (`*/1 * * * *` → `/api/poll`)
- [x] Firestore rules + composite indexes (incl. collection-group on
  `northSessionToken`) deployed to `vibeandpay`
- [x] All 17 production env vars set in Vercel (Anthropic, Firebase web +
  admin, encryption key, Resend, cron secret, app URL, North dev fallback
  trio)
- [x] `firebase-admin` private-key handler tolerates both dotenv-stripped
  and Vercel-quoted forms (was the source of an early prod 500)
- [x] **AI SDK base URL pinned** in `src/lib/ai/client.ts` so it ignores the
  `ANTHROPIC_BASE_URL` env var that Claude Code's local shell exports without
  the `/v1` suffix (was causing a silent 404 against `api.anthropic.com/messages`)
- [x] **Anthropic model upgraded to `claude-sonnet-4-6`** (the original
  `claude-sonnet-4-5` was retired by Anthropic — calls 404'd)
- [x] **Resend response error-handling**: SDK returns `{ error }` instead of
  throwing on non-2xx; checkout / invoice / receipt routes now surface those
  failures in the chat ("Link created — email failed; share <url>") instead
  of falsely reporting success
- [x] Embedded-checkout iframe height pinned to 760/820px via a `<style>`
  rule on `#checkout-container iframe` with `!important` (descendant
  selector — North wraps the iframe in its own divs, so a `>` direct-child
  selector misses it; `!important` beats North's inline-style heights)
- [x] **Pay page section restructured** so the embed spans the full card
  width (the section's `p-6` padding was eating ~48px on mobile, squishing
  North's form below its minimum width)
- [x] **AI SDK v6 multi-step tool calling re-enabled** via
  `stopWhen: isLoopFinished()` — v6 default is `stepCountIs(1)` which broke
  chained tool calls (`getCustomers → createCheckout` would halt after the
  first call with no confirmation card)
- [x] Two real-email demo customers seeded for the `a.giron0817@gmail.com`
  test account: **Alex Giron** (`a.giron0817@gmail.com`) and **Miami AI
  Solutions** (`miamiaisolutions@gmail.com` — the Resend account inbox)
- [x] **Polling captures full North status response** in
  `metadata.northStatus` and probes 6 candidate field names for
  `northTransactionId` (`transactionId`, `transId`, `tranId`, `paymentId`,
  `orderId`, `id`) plus one level of nesting — North's response shape isn't
  documented and the txn id wasn't being captured
- [x] **Refund route falls back to local-only refund** when no
  `northTransactionId` can be found anywhere (seeded demo data + real txs
  where polling missed the field) — sets `metadata.refundedLocally: true`
- [x] **Markdown rendering for assistant messages** via `react-markdown` +
  `remark-gfm` — GFM tables, bold, bullets, code, and links styled to the
  dark theme; user messages still use the existing `@`/`#` token highlighter
- [x] **Sidebar overflow fix** — `AppSidebarBody` is constrained with
  `w-full min-w-0 overflow-hidden` so long thread titles truncate inside
  the 256px aside instead of bleeding past the right border
- [x] **New chat button** generates a fresh UUID and pushes to
  `/chat/[id]` so it works even when the user is already on `/chat`; the
  `[threadId]` page treats a missing thread doc as an empty new chat
  rather than a "not found" state
- [x] **Tokenizer is email-aware** — `@` only highlights as a customer
  mention when not preceded by an email-y character, so `test@gmail.com`
  renders as plain text instead of a chopped-up mention
- [x] **Customer triggers renamed to hyphenated form** — `#customer-add`
  and `#customer-edit` so they render as one solid violet action token
- [ ] North dashboard allowed-domains list updated to include
  `https://vibe-and-pay.vercel.app` *(if the iframe stops mounting silently
  during demo, this is the cause — Embedded Checkout Designer)*
- [ ] Resend custom sending domain verified *(without it, customer emails
  only deliver to `miamiaisolutions@gmail.com`; verified for dev demo, blocks
  sending to anyone else)*
- [ ] **Identify North's actual txn-id field name** — once a paid
  transaction lands with the new metadata snapshot, inspect
  `metadata.northStatus` in Firestore and add the field to `TX_ID_KEYS` in
  `src/lib/north/extract.ts` so real refunds (not local-only) work

---

## Must Have (Golden Path)

The golden path is the *one demo flow* that must work flawlessly:

1. Sign up → 2. Pick demo mode → 3. Enter North creds → 4. Type
   `send #checkout to @george for $300` → 5. See rich confirmation card →
   6. Click confirm → 7. Branded email arrives → 8. Customer clicks link →
   9. Pays on `/pay/[token]` (embedded checkout) → 10. Transaction status flips
   to `paid` in real time on merchant's dashboard.

### Auth & Onboarding
- [x] Firebase Auth, email + password only
- [x] Registration → onboarding screen with two cards: **"Demo Mode"** (seeds 8
  customers + 12 transactions + 2 sample threads) or **"Start Fresh"** (empty)
  *(2 sample threads still pending — land with chat UI in Phase 2)*
- [x] Settings page collects North credentials (`PRIVATE_API_KEY`, `CHECKOUT_ID`,
  `PROFILE_ID`), encrypted at rest before Firestore write
- [ ] LocalStorage caches most-recent credentials for return visits

### Chat
- [x] Claude.ai-style sidebar with thread list, "New Chat" button at top
- [x] Message thread with streaming "thinking…" spinner with rotating playful
  status lines ("Reading the room…", "Crunching numbers…", "Drafting it up…")
- [x] `@` autocomplete: filters customers by name / email / company,
  popover above the input, arrow-key + Enter selects
- [x] `@` mentions are email-aware (won't fire mid-email-address)
- [x] `#` autocomplete: lists the 8 available tools with one-line descriptions
  (`#checkout`, `#invoice`, `#payment-link`, `#refund`, `#void`, `#report`,
  `#customer-add`, `#customer-edit`)
- [x] Auto-generated thread titles (Claude generates 3-5 word title after first
  response)
- [ ] Suggested prompts on empty state with merchant's name personalized
  *(static prompts exist; merchant-name personalization pending)*
- [x] Read tools execute without confirmation; write tools render rich
  confirmation card with editable fields + Confirm/Cancel
- [x] Confirmation cards for `#checkout` and `#invoice` show a read-only
  line-items list above the editable fields when Claude extracts items
- [x] Live tool-call progress streamed inline (in-flight status per tool,
  e.g. "Looking up customers…", "Crunching numbers…", "Drafting checkout…",
  plus a ✓ confirmation pill when read tools finish)
- [x] Assistant messages render markdown (GFM tables, bold, bullets, links)
  via `react-markdown` + `remark-gfm`

### Tools (AI-callable, hashtag-triggered)
- **Read (no confirmation):**
  - [x] `getCustomers` — list/search customers
  - [x] `getCustomer` — single customer detail + recent transactions
  - [x] `getTransactions` — list/filter transactions
  - [x] `getTransaction` — single transaction detail
  - [x] `getReport` — `#report` aggregate stats (revenue, top customers, overdue)
- **Write (confirmation required):**
  - [x] `createCheckout` — `#checkout`, generates payment URL, sends email
  - [x] `createInvoice` — `#invoice`, sends invoice email with due date
  - [x] `createPaymentLink` — `#payment-link`, generates a reusable URL
  - [x] `refundTransaction` — `#refund`, calls North refund endpoint with the
    `northTransactionId` once payment is settled (only `paid` txs eligible)
  - [x] `voidTransaction` — `#void`, voids pending `sent`/`viewed` txs (skips
    the North API when the customer never started paying — just stops polling
    and marks `voided`)
  - [x] `addCustomer` — `#customer add`
  - [x] `updateCustomer` — `#customer edit`

### Customers
- [x] `/customers` — table with search, name/email/company columns, "Add
  Customer" button
- [x] `/customers/[id]` — detail page with editable fields + that customer's
  transaction history
- [x] Per-customer `preferredLanguage` field (default `en`) on the schema and seed
  *(field is editable per-customer in the detail page; used to localize the
  checkout email; invoice/receipt emails will use it once those templates exist)*

### Transactions
- [x] `/transactions` — reverse-chronological table, filter pills (All / Sent /
  Paid / Overdue / Refunded), search by customer name
- [x] Each row clickable → side panel with full transaction detail, line items,
  status timeline, "View payment page" link

### Custom Payment Page (`/pay/[token]`)
- [x] Public route, no auth required
- [x] Merchant logo + business name at top
- [x] "Pay [Merchant Name]" headline
- [x] Line item summary with total
- [x] Embedded Checkout iframe below (uses Form integration via
  `checkout.mount()`)
- [x] Small "Powered by Vibe & Pay" footer
- [x] On success: thank you state with receipt
  *(renders when transaction status reaches `paid`; explicit failure state
  with retry not yet built — failures stay on the landing page)*
- [ ] Customer's bilingual handled by their `preferredLanguage`
  *(payment landing copy is English-only; the email customers receive IS
  bilingual)*

### Branded Emails (Resend + React Email)
- [x] One base layout component: merchant logo + brand color header, content,
  footer
- [x] Checkout request email
- [x] Invoice email *(uses customer's `preferredLanguage`, renders due date)*
- [x] Payment receipt email *(sent automatically by polling cron when a tx
  flips to `paid`; shows last-4 of the North transaction ID)*
- [x] Bilingual based on customer's `preferredLanguage`

### Polling (replaces webhooks for hackathon)
- [x] `vercel.json` cron schedule wired (`/api/poll` every 1 minute)
- [x] `/api/poll` route — collection-group query for transactions with
  `pollingActive == true`, oldest `lastPolledAt` first, batch of 50
- [x] For each: hit North `/api/sessions/status`, update status (`paid` /
  `failed` / `viewed`), set `northTransactionId`, surface in real time on the
  merchant's `/transactions` view (Firestore live listener), append a system
  message into the originating chat thread ("✅ Beth just paid $640") and
  send a branded receipt email to the customer.
- [x] Stop polling after 24 hours per transaction (`pollingActive: false`,
  status flips to `expired` if it was still `sent`/`viewed`)

### Settings
- [x] Business name
- [ ] Logo upload (Vercel Blob)
- [ ] Brand color (hex picker)
- [x] North credentials (paste fields, masked after save)
- [ ] Default invoice terms (Net 15 / 30 / 60) *(API accepts; UI pending)*
- [x] UI language toggle (English / Spanish) — picker on settings page;
  `merchant.language` is the source of truth, picked up live by the chat
  system prompt and the I18nProvider

### Internationalization
- [x] `next-intl` set up with merchant-language-driven locale (sidebar,
  settings, chat empty state + input placeholder translated)
  *(customer-list, transaction-list, auth-page strings still English-only —
  Phase 6 polish if a Spanish-first merchant onboards)*
- [x] Email templates bilingual via customer's `preferredLanguage` (all 3:
  checkout, invoice, payment receipt)
- [x] Claude system prompt instructed to respond in merchant's UI language

### Marketing Homepage (`/`, public)
- [x] Space-themed: animated starfield canvas with depth-layered drift,
  parallax on mouse move, twinkle, occasional shooting star, nebula
  gradients, plus constellation lines between hub stars with purple/cyan
  payment pulses traveling along them
- [x] Sticky nav with logo (dark/light variants), Sign in, Start free CTA,
  and a sun/moon theme toggle (preference saved in `localStorage`)
- [x] Hero: "Chat to get paid." headline + chat-preview animation that loops
  through 4 tool demos (`#checkout`, `#invoice`, `#transactions`, `#report`)
  with type → reveal-card → erase → next pacing
  *(replaced the wordmark-only h1 with a value-prop headline; wordmark moved to the nav)*
- [x] Features grid (4 cards): Natural-language payments, Embedded checkout,
  Smart customer memory, Real-time payment tracking
- [x] "How it works" 3-step: Sign up → Connect North → Chat to get paid
- [x] FAQ accordion (8 questions)
- [x] Pre-footer CTA section ("Ready when you are.")
- [x] Footer with legal links *(Terms / Privacy / Security as placeholder `#` hrefs until pages exist)*

### Mobile
- [x] Responsive chat: input docked at the bottom, sidebar collapses to a
  drawer (hamburger top bar at `md:hidden` opens a `Sheet` containing the
  same nav contents)
- [x] Mobile-friendly `@` and `#` pickers — popover spans the input's full
  width at any breakpoint, arrow-key + Enter selection works on touch
  keyboards (Tab also accepts)
- [x] Custom payment page mobile-first — `max-w-xl` centered card, 4px-stroke
  brand-colored top border, embedded form scales to viewport width
- [x] Customer + transaction tables wrap in `overflow-x-auto` with a sensible
  `min-w` so they horizontal-scroll cleanly at sub-640px widths

---

## Nice to Have

- **`/demo` auto-login route** — bookmark to skip signup on demo day
- **Voice input** — Web Speech API for the chat input
- **Dev mode toggle** — drawer on each AI message showing the underlying
  Claude API call (input, output, latency)
- **Audit log per customer** — every interaction (invoices sent, payments
  received, conversation references) on customer detail page
- **Bulk follow-up flow** — "Show overdue customers and draft a follow-up to
  each" — multi-step plan with per-message confirmation
- **Suggested prompts that update contextually** — based on time of day,
  recent activity, or unfinished tasks
- **Quick-action buttons on confirmation cards** — "Send via SMS instead",
  "Schedule for tomorrow"
- **System prompt visibility** — log to message trace, never expose in UI
- **Apple Pay / Google Pay** in the embedded checkout (just enable in North
  Designer; iframe needs `allow="payment"`)
- **90-second product video** embedded on homepage hero

---

## Out of Scope (v1)

Things explicitly cut so we ship the weekend:

- ❌ Multiple team members per merchant
- ❌ Webhooks (using polling instead)
- ❌ Multi-currency (USD only)
- ❌ SMS sending (Twilio integration)
- ❌ Recurring billing / subscriptions
- ❌ Custom report builder (just a fixed `#report` set)
- ❌ Plugin system / extensibility
- ❌ Pricing page on marketing site (no billing yet)
- ❌ Onboarding tour / product walkthrough
- ❌ Stripe/Square/PayPal integrations (North only)
- ❌ Scheduled / future-dated payments
- ❌ Server-side rendered customer-facing emails (we use Resend, they handle
  rendering)
