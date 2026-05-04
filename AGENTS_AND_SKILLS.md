# Vibe & Pay — Agents, Skills & Hooks Spec

> Spec for what to create in `.claude/` on the very first Claude Code session.
> Read alongside `FEATURES.md`, `ARCHITECTURE.md`, and `SETUP.md`.

---

## Subagents (in `.claude/agents/`)

Four project subagents. Each is a markdown file with YAML frontmatter and a
system prompt. The `description` field is what triggers automatic delegation
— write it carefully, with phrases like "Use proactively when…" or "MUST BE
USED for…" to encourage Claude to delegate.

### 1. `north-api-expert.md`

**Purpose:** Owns all code that talks to North's API. Catches the integration
gotchas we learned from their sample repo.

**Frontmatter:**
- `name: north-api-expert`
- `description: Use proactively for any work touching lib/north/*, /api/north/*, /api/poll, the /pay/[token] page, or any code that calls North's Embedded Checkout API. MUST BE USED before writing or modifying North API integration code.`
- `tools: Read, Grep, Glob, Edit, Write, Bash`
- `model: inherit`
- `color: blue`

**System prompt should establish:**
- Has internalized North's Embedded Checkout sample repo (`NorthDevelopers/North-EC-Sample-JS`)
- Uses the **Form** integration: `checkout.mount(token, containerId)` in an iframe with `allow="payment"`
- Knows the status endpoint quirks: requires four headers (`Authorization: Bearer {key}`, `SessionToken`, `CheckoutId`, `ProfileId`); rejects requests with browser `Origin` header (server-only)
- Knows session tokens are JWTs containing a `domain` claim; mismatch with page origin causes silent `mount()` hang — always validate
- Knows sessions expire in 30 minutes; always create fresh per attempt
- Validates that ALL North calls happen server-side, never from browser JS
- Reviews error handling: AbortController with 60s timeout, 502 on network errors, redacts card data in logs (cardNumber, cvv, exp, etc.)
- For Direct Post (not used in v1, but knows about it), expiry is MMYY format
- Test cards: `4111 1111 1111 1111` (Visa), `3700 000000 00002` (Amex)

---

### 2. `firestore-schema-guard.md`

**Purpose:** Reviews any Firestore work against the locked schema in
`ARCHITECTURE.md`. Read-only — produces reviews, doesn't write code.

**Frontmatter:**
- `name: firestore-schema-guard`
- `description: MUST BE USED before writing or modifying any code that adds, queries, or changes Firestore documents, security rules, or indexes. Use proactively when reviewing data model changes.`
- `tools: Read, Grep, Glob`
- `model: inherit`
- `color: orange`

**System prompt should establish:**
- Treats `ARCHITECTURE.md`'s "Firestore Data Model" section as ground truth
- Knows the nested structure: everything lives under `merchants/{uid}` so security rules trivially derive from `auth.uid` matching
- Catches missing composite indexes — flags any query that filters on multiple fields or combines `where` + `orderBy` without a matching index
- Catches denormalized field drift: `customerName` on transaction docs must stay in sync with `customers/{id}.name`; flags writes that update one without the other
- Catches unbounded queries (no `limit()`)
- Verifies `pollingActive: false` is set after terminal status (`paid`, `failed`, `refunded`, `voided`, `expired`)
- Verifies all server-side queries use the Admin SDK (`firebase-admin`), all client-side use the Web SDK (`firebase`)
- ABSOLUTELY blocks: encrypted credential fields (`northCredentialsCipher`, `northCredentialsIV`) being read into plaintext anywhere on the client
- Validates security rules match the "user can read/write own subtree" pattern
- When asked to review, returns findings as: Critical (must fix) / Warning (should fix) / Note (FYI)

---

### 3. `ai-tool-builder.md`

**Purpose:** Owns the AI tool definitions and Claude system prompt. Enforces
the read-vs-write pattern.

**Frontmatter:**
- `name: ai-tool-builder`
- `description: Use when adding or modifying any AI tool in lib/ai/tools.ts, the chat system prompt in lib/ai/systemPrompt.ts, or any new hashtag-triggered behavior in the chat UI.`
- `tools: Read, Grep, Glob, Edit, Write`
- `model: inherit`
- `color: purple`

**System prompt should establish:**
- Knows the 12 tools defined in `ARCHITECTURE.md`:
  - **Read tools (no confirmation):** `getCustomers`, `getCustomer`, `getTransactions`, `getTransaction`, `getReport`
  - **Write tools (require confirmation):** `addCustomer`, `updateCustomer`, `createCheckout`, `createInvoice`, `createPaymentLink`, `refundTransaction`, `voidTransaction`
- Enforces the read-vs-write pattern absolutely:
  - Read tools execute immediately and return data
  - Write tools return a confirmation card payload — **NO side effects in the tool itself**
  - Every write tool gets a separate API endpoint that fires only after the user clicks Confirm in the UI
- Uses Zod schemas for every tool input — these are the source of truth for type safety AND for what Claude sees as tool definitions
- Read tools can chain into write tools within one AI turn (Claude calls `getCustomers({ query: 'george' })`, gets George's ID, then proposes `createCheckout({ customerId: 'cus_abc', amount: 300 })` — the proposal is a confirmation card, not a side effect)
- Bilingual: tool descriptions and confirmation card field labels must work in EN and ES via `next-intl`
- Reviews system prompt changes for: clarity of when to use each hashtag, instruction to respond in merchant's UI language, instruction to NEVER execute a write without going through the confirmation flow

---

### 4. `ui-polish-reviewer.md`

**Purpose:** Reviews components for brand consistency, mobile, and
accessibility. Read-only — produces reviews, doesn't write code.

**Frontmatter:**
- `name: ui-polish-reviewer`
- `description: Use proactively after any component or page is created or significantly modified. MUST BE USED before marking any SETUP.md checkpoint complete.`
- `tools: Read, Grep, Glob`
- `model: inherit`
- `color: pink`

**System prompt should establish:**
- Brand: space theme. Tokens: bg `#0A0A1F`, surface `#13132A`, accent purple `#7C3AED`, accent cyan `#06B6D4`, text `#E2E8F0`. Inter for body, JetBrains Mono for numbers/code.
- Mobile-first review:
  - Chat: input docked at bottom on mobile, sidebar collapses to drawer
  - `cmdk` pickers (`@`, `#`): full-width on small screens
  - Payment landing page (`/pay/[token]`): mobile-first since most customers pay from phones
  - Tap targets minimum 44px
- Accessibility:
  - Keyboard nav for all `cmdk` pickers
  - Visible focus rings using cyan accent
  - Semantic HTML (`<button>` not `<div onClick>`)
  - `aria-label` on icon-only buttons
  - Color contrast meets WCAG AA against bg/surface
- Consistency:
  - All confirmation cards use the single `<ConfirmationCard>` component
  - All status indicators use `<StatusPill>`
  - All currency formatted via one `formatCurrency()` util
  - All dates via one `formatDate()` util with locale support
- No layout shift, no obvious AI-generated quirks: random emoji, em-dashes everywhere, generic copy like "Welcome to your dashboard!", placeholder Lorem Ipsum
- Catches: hardcoded hex colors instead of design tokens, inline styles instead of Tailwind classes, missing loading/empty/error states, missing translations (hardcoded English strings)
- Returns findings as: Critical / Warning / Suggestion with file paths and line numbers

---

## Skills (in `.claude/skills/`)

Three project skills. Each is a folder containing `SKILL.md`. The
`description` field triggers auto-loading when relevant — write so it actually
fires on the right tasks.

### 1. `north-integration/SKILL.md`

**Frontmatter:**
- `description: Use when implementing or debugging any North Embedded Checkout API call — session creation, status polling, the /pay/[token] payment landing page, polling cron, or webhook handling. Includes endpoint reference, headers, session lifecycle, and test cards.`

**Contents should cover:**
- Endpoint reference table:
  - `POST https://checkout.north.com/api/sessions` — body: `{ checkoutId, profileId, amount, products? }`, header: `Authorization: Bearer {merchantApiKey}`
  - `GET https://checkout.north.com/api/sessions/status` — headers: `Authorization`, `SessionToken`, `CheckoutId`, `ProfileId` (server-only; rejects browser `Origin`)
- Session lifecycle: `Open → Verified → Approved | Declined`, with what each transition means and what triggers it
- Polling rules:
  - Minimum 15s between calls per transaction
  - Stop after 24h (set `pollingActive: false`)
  - Stop on terminal status (`paid`, `failed`, `refunded`, `voided`, `expired`)
- Failure modes and how to detect each:
  - Origin mismatch → silent `mount()` hang → check JWT `domain` claim against `location.origin`
  - Expired session → 401 from status endpoint → create fresh session
  - Network timeout → wrap in `AbortController` with 60s budget
- Code snippets for the wrapper functions in `lib/north/client.ts` (createSession, getStatus)
- Test cards: `4111 1111 1111 1111` (Visa, any future expiry, any CVV, any 5-digit ZIP), `3700 000000 00002` (Amex)
- Sandbox vs production: same code path, just different credentials
- Link to the sample repo we learned from: `https://github.com/NorthDevelopers/North-EC-Sample-JS`

---

### 2. `vibe-design-system/SKILL.md`

**Frontmatter:**
- `description: Use when building or modifying any UI component, page layout, email template, or marketing asset. Defines Vibe & Pay's space-themed color tokens, typography, spacing, animation, and starfield specs.`

**Contents should cover:**
- Full color palette with semantic token names:
  - `--bg: #0A0A1F` (page background)
  - `--surface: #13132A` (cards, inputs)
  - `--surface-elevated: #1C1C3A` (modals, hover states)
  - `--accent: #7C3AED` (primary purple)
  - `--accent-secondary: #06B6D4` (cyan)
  - `--text: #E2E8F0` (primary text)
  - `--text-muted: #94A3B8` (secondary text)
  - `--border: #2A2A45`
  - `--danger: #EF4444`, `--success: #10B981`, `--warning: #F59E0B`
- Type scale (size / weight / line-height):
  - display: 48px / 700 / 1.1
  - h1: 36px / 700 / 1.2
  - h2: 28px / 600 / 1.3
  - h3: 22px / 600 / 1.4
  - h4: 18px / 600 / 1.4
  - body: 15px / 400 / 1.6
  - caption: 13px / 400 / 1.5
  - mono: 14px / 500 / 1.4 (JetBrains Mono — for numbers, codes, transaction IDs)
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 (Tailwind-aligned: `p-1` = 4px)
- Component patterns:
  - Cards: `bg-surface`, 1px `border-border`, 12px radius, soft purple glow on hover (`shadow-[0_0_24px_rgba(124,58,237,0.15)]`)
  - Buttons: subtle scale on press (`active:scale-[0.98]`), 200ms transition
  - Inputs: focus ring 2px cyan with 2px offset
  - Modals/dialogs: backdrop blur + 60% bg opacity
- Animation: 200ms ease-out default, 400ms for page transitions, NO bounce
- Starfield (marketing pages):
  - HTML canvas, ~200 stars
  - Slow random drift (0.05–0.15 px/frame)
  - Parallax on mouse move (subtle, max 5px offset)
  - Single component (`<Starfield />`), pure JS, no library
  - Stars fade in/out at random intervals
- Forbidden:
  - Pure black `#000000` (use `--bg`)
  - Default Tailwind blue (`blue-500`, etc.) — clashes with cyan accent
  - Generic shadcn defaults that fight the brand
  - Em-dash spam in copy (one or two is fine, ten in a paragraph is not)
  - Generic SaaS copy: "Welcome to your dashboard," "Get started," "Powered by AI"

---

### 3. `confirmation-card-pattern/SKILL.md`

**Frontmatter:**
- `description: Use when implementing any AI-triggered write action that requires user confirmation. Covers the ConfirmationCard component pattern used by #checkout, #invoice, #refund, #void, #payment-link, and #customer add/edit tools.`

**Contents should cover:**
- The execution model:
  1. User types: `send #checkout to @george for $300`
  2. AI calls `createCheckout` tool with parsed args
  3. Tool returns `{ type: 'createCheckout', data: {...} }` — **NO side effects**
  4. UI renders `<ConfirmationCard>` with the data
  5. User edits any field if needed (amount, due date, line items, etc.)
  6. User clicks Confirm → fires `POST /api/transactions/checkout` with final data
  7. API route does the actual work: creates North session, saves to Firestore, sends email
  8. Result message appears in chat: "✓ Checkout sent to George ($300)"
- The `<ConfirmationCard>` component API:
  ```tsx
  <ConfirmationCard
    title="Send checkout to George Smith"
    summary="$300.00 via email to george@example.com"
    fields={[
      { label: 'Amount', name: 'amount', type: 'currency', editable: true, value: 300 },
      { label: 'Send to', name: 'email', type: 'email', editable: true, value: 'george@example.com' },
      { label: 'Due', name: 'dueDate', type: 'date', editable: true, value: '2026-06-02' },
    ]}
    confirmLabel="Send checkout"
    cancelLabel="Cancel"
    onConfirm={(values) => executeCreateCheckout(values)}
    onCancel={() => markCancelled()}
    secondaryAction={{ label: 'Send via SMS instead', onClick: ... }}  // optional
  />
  ```
- Edit tracking: when user changes a field, store `{ field, original, edited }` in the message's `confirmationCard.edits` array. Useful for the dev drawer trace and for honest reporting back to the user ("Sent to george@example.com (you edited from g.smith@example.com)")
- Loading state during execution: button shows spinner, fields disabled, "Creating session…" status
- Error state: if execute API fails, show error in card with "Retry" button — don't lose the user's edits
- One example for each of the 7 write tools showing what `data` shape they return:
  - `createCheckout` → amount + customer + line items + send method
  - `createInvoice` → above + due date + invoice terms
  - `createPaymentLink` → amount + label + optional customer
  - `refundTransaction` → original transaction + amount + reason
  - `voidTransaction` → original transaction + reason
  - `addCustomer` → name + email + phone + company + preferredLanguage
  - `updateCustomer` → customerId + diff of changed fields

---

## Hooks (in `.claude/settings.json` + `.claude/hooks/`)

Four hooks. Keep it tight — these are the high-value ones for a hackathon.

### 1. Auto-format with Prettier on save

**Event:** `PostToolUse`
**Matcher:** `Write|Edit`
**Behavior:** Run `pnpm prettier --write` on the file path from the tool input. Limit to `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md` extensions. On success, output JSON with `suppressOutput: true` so it doesn't clutter the conversation. On failure, exit 1 with the Prettier error so I can see what's wrong.

**Why:** Eliminates the most annoying class of "click approve, click approve" interruptions. Files arrive formatted; Claude doesn't need to think about it.

---

### 2. Block writes to sensitive files

**Event:** `PreToolUse`
**Matcher:** `Write|Edit`
**Behavior:** Read the file path from tool input. If it matches `.env*`, `firebase-service-account.json`, anything under `.git/`, or anything under `node_modules/`, exit code 2 with stderr message: "Blocked: writes to {path} are not permitted. If you really need this, ask the user first."

**Why:** Hard guarantee against accidentally committing secrets or corrupting the git history. Hooks are deterministic — they don't forget like prompts can.

---

### 3. Warn on direct Firestore writes from client code

**Event:** `PostToolUse`
**Matcher:** `Write|Edit`
**Behavior:** If the modified file path matches `src/components/**` OR `src/app/**` (excluding `src/app/api/**`), AND the file content contains any of `setDoc(`, `updateDoc(`, `deleteDoc(`, `addDoc(` from `firebase/firestore`, write to stderr: "WARNING: Direct Firestore write detected in client code at {path}. Consider routing through an API route in `src/app/api/` for validation, encryption, and consistency. (Not blocking — just flagging.)" Exit 0 (don't block).

**Why:** Catches an architectural mistake that's easy to make and painful to fix later. Loud but non-blocking — sometimes a direct client write is correct (e.g., a user's own preference doc), but most of the time it should go through a server route for validation.

---

### 4. Bash audit log

**Event:** `PreToolUse`
**Matcher:** `Bash`
**Behavior:** Append a JSON line to `.claude/audit.log` with: `{ timestamp: ISO string, command: tool_input.command, description: tool_input.description }`. Exit 0 always — never blocks.

**Why:** Sunday morning when something's broken, you can `grep` the log to see exactly what ran. Add `.claude/audit.log` to `.gitignore`.

---

### Hook implementation notes

- Put scripts in `.claude/hooks/` (e.g., `.claude/hooks/format-on-save.sh`, `.claude/hooks/block-sensitive.sh`, etc.)
- `chmod +x` every script
- Use `jq` to parse the JSON payload from stdin (it's installed on macOS by default; for Linux: `apt install jq`)
- Reference scripts from `.claude/settings.json` using `$CLAUDE_PROJECT_DIR/.claude/hooks/script-name.sh` so paths are absolute
- Add `.claude/settings.local.json` and `.claude/audit.log` to `.gitignore`. `.claude/settings.json` SHOULD be committed (team-wide config).

---

## Setup order

When Claude Code first reads this spec, the order should be:

1. Create `.claude/agents/` and write all four subagent files
2. Create `.claude/skills/` and write all three skill folders with `SKILL.md` inside
3. Create `.claude/hooks/` and write the four hook scripts; `chmod +x` them
4. Create `.claude/settings.json` referencing the hook scripts
5. Update `.gitignore` to include `.claude/settings.local.json` and `.claude/audit.log`
6. Show the resulting `.claude/` directory tree
7. Stop and wait for confirmation before scaffolding the Next.js app
