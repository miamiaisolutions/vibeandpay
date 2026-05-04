---
name: vibe-design-system
description: Use when building or modifying any UI component, page layout, email template, or marketing asset. Defines Vibe & Pay's space-themed color tokens, typography, spacing, animation, and starfield specs.
---

# Vibe & Pay — Design System

Space-themed. Deep indigo background, purple/cyan glow accents, no pure black, no Tailwind blue.

## Color tokens

Define these as CSS variables in the global stylesheet; reference them everywhere.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0A1F` | Page background |
| `--surface` | `#13132A` | Cards, inputs |
| `--surface-elevated` | `#1C1C3A` | Modals, hover states |
| `--accent` | `#7C3AED` | Primary actions, brand color |
| `--accent-secondary` | `#06B6D4` | Focus rings, secondary accents |
| `--text` | `#E2E8F0` | Primary text |
| `--text-muted` | `#94A3B8` | Secondary text, captions |
| `--border` | `#2A2A45` | Dividers, card borders |
| `--danger` | `#EF4444` | Errors, destructive actions |
| `--success` | `#10B981` | Paid, confirmed |
| `--warning` | `#F59E0B` | Overdue, pending |

## Typography

- Body: **Inter**, loaded via `next/font/google`.
- Numbers, transaction IDs, codes: **JetBrains Mono**, also `next/font/google`.

| Style | Size | Weight | Line height | Use |
|---|---|---|---|---|
| display | 48px | 700 | 1.1 | Marketing hero |
| h1 | 36px | 700 | 1.2 | Page titles |
| h2 | 28px | 600 | 1.3 | Section headers |
| h3 | 22px | 600 | 1.4 | Card titles |
| h4 | 18px | 600 | 1.4 | Subheaders |
| body | 15px | 400 | 1.6 | Default |
| caption | 13px | 400 | 1.5 | Metadata |
| mono | 14px | 500 | 1.4 | Numbers, IDs |

## Spacing

Tailwind-aligned: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Use `p-1` / `p-2` / `p-3` / `p-4` / `p-6` / `p-8` / `p-12` / `p-16`. Don't invent intermediate values.

## Component patterns

**Cards**

```
bg-[var(--surface)]
border border-[var(--border)]
rounded-xl                 /* 12px */
hover:shadow-[0_0_24px_rgba(124,58,237,0.15)]
transition-shadow duration-200
```

**Buttons**

```
bg-[var(--accent)] text-white
rounded-lg
active:scale-[0.98]
transition-all duration-200
```

**Inputs**

```
bg-[var(--surface)] border border-[var(--border)]
focus:ring-2 focus:ring-[var(--accent-secondary)] focus:ring-offset-2
focus:ring-offset-[var(--bg)]
rounded-md
```

**Modals / dialogs**

Backdrop: `bg-black/60 backdrop-blur-sm`. Content surface: `bg-[var(--surface-elevated)]`.

## Animation

Default duration **200ms ease-out**. Page transitions **400ms**. No bounce, no overshoot, no spring physics — calm, glassy, deliberate.

## Starfield (marketing only)

A single `<Starfield />` component, pure JS canvas, no library.

- ~200 stars
- Slow random drift, 0.05–0.15 px/frame
- Parallax on mouse move, max 5px offset, eased
- Random opacity fade in/out at 4–8s intervals
- Stars are 1–2px; mix `--accent` and `--accent-secondary` at low alpha (0.4–0.8)

## Forbidden

- Pure black `#000000` — use `--bg`.
- Default Tailwind `blue-*` — clashes with the cyan accent.
- Generic shadcn defaults that fight the brand (override the default button primary/secondary to match the palette).
- Em-dash spam in copy (one or two per paragraph is fine, ten is not).
- Generic SaaS copy: "Welcome to your dashboard," "Get started," "Powered by AI."
- Random emoji.
- Inline `style={{ ... }}` for static styling — use Tailwind.

## Tone

Direct, friendly, slightly playful — never bro-ey, never corporate.

Examples to keep:
- "Send checkout to George Smith" (action button)
- "✅ Beth just paid $640" (system message)
- "Crunching numbers…" (thinking spinner)

Examples to avoid:
- "Successfully sent payment request 🎉🚀"
- "Welcome back to your command center!"
- "Your AI-powered finance assistant"
