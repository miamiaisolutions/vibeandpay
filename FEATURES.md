# Vibe & Pay — Features

> AI copilot for North merchants. Chat-first interface where merchants use
> hashtags (`#checkout`, `#invoice`, etc.) and `@mentions` to send payments,
> manage customers, and run reports.

> Status legend: `[x]` = built and verified, `[ ]` = not built yet.
> Partial deliveries note what's missing in parentheses.

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
- [x] `#` autocomplete: lists the 8 available tools with one-line descriptions
- [x] Auto-generated thread titles (Claude generates 3-5 word title after first
  response)
- [ ] Suggested prompts on empty state with merchant's name personalized
  *(static prompts exist; merchant-name personalization pending)*
- [x] Read tools execute without confirmation; write tools render rich
  confirmation card with editable fields + Confirm/Cancel
- [x] Live tool-call progress streamed inline (in-flight status per tool,
  e.g. "Looking up customers…", "Crunching numbers…", "Drafting checkout…",
  plus a ✓ confirmation pill when read tools finish)

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
- [ ] Responsive chat (input docked bottom, sidebar collapses to drawer)
- [ ] Mobile-friendly `@` and `#` pickers (full-width on small screens)
- [ ] Custom payment page mobile-first (most customers will pay from phones)

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
