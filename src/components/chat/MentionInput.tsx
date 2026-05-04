'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore'
import { Hash, AtSign } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { auth, db } from '@/lib/firebase/client'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { tokenizeText } from './tokenizeText'

type CustomerOption = {
  id: string
  name: string
  email: string
  company: string | null
}

const TOOL_DEFS: Array<{ id: string; trigger: string; descriptionKey: string }> = [
  { id: 'checkout', trigger: '#checkout', descriptionKey: 'toolCheckout' },
  { id: 'invoice', trigger: '#invoice', descriptionKey: 'toolInvoice' },
  { id: 'payment-link', trigger: '#payment-link', descriptionKey: 'toolPaymentLink' },
  { id: 'refund', trigger: '#refund', descriptionKey: 'toolRefund' },
  { id: 'void', trigger: '#void', descriptionKey: 'toolVoid' },
  { id: 'report', trigger: '#report', descriptionKey: 'toolReport' },
  { id: 'customer-add', trigger: '#customer-add', descriptionKey: 'toolCustomerAdd' },
  { id: 'customer-edit', trigger: '#customer-edit', descriptionKey: 'toolCustomerEdit' },
]

type PickerKind = '@' | '#'
type PickerState = {
  open: boolean
  kind: PickerKind | null
  query: string
  triggerStart: number // index in `value` where the @ or # sits
  selectedIdx: number
}

const CLOSED: PickerState = {
  open: false,
  kind: null,
  query: '',
  triggerStart: -1,
  selectedIdx: 0,
}

export type MentionInputHandle = {
  focus: () => void
  clear: () => void
}

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export const MentionInput = forwardRef<MentionInputHandle, Props>(
  function MentionInput(
    { value, onChange, onSubmit, disabled, placeholder },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [picker, setPicker] = useState<PickerState>(CLOSED)
    const [user, setUser] = useState<User | null>(auth.currentUser)
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const t = useTranslations('Chat')
    const toolOptions = useMemo(
      () =>
        TOOL_DEFS.map((d) => ({
          id: d.id,
          trigger: d.trigger,
          description: t(d.descriptionKey),
        })),
      [t],
    )

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => {
        onChange('')
        setPicker(CLOSED)
      },
    }))

    useEffect(() => onAuthStateChanged(auth, setUser), [])

    useEffect(() => {
      if (!user) return
      const q = query(
        collection(db, 'merchants', user.uid, 'customers'),
        orderBy('lastInteractionAt', 'desc'),
      )
      return onSnapshot(
        q,
        (snap) => {
          setCustomers(
            snap.docs.map((d) => {
              const data = d.data() as Record<string, unknown> & {
                lastInteractionAt?: Timestamp | null
              }
              return {
                id: d.id,
                name: String(data.name ?? ''),
                email: String(data.email ?? ''),
                company: (data.company as string | null) ?? null,
              }
            }),
          )
        },
        () => {
          /* swallow — picker just won't show suggestions */
        },
      )
    }, [user])

    // Filtered options based on current picker state
    const filtered = useMemo<
      Array<{ id: string; primary: string; secondary?: string }>
    >(() => {
      if (!picker.open || !picker.kind) return []
      const lc = picker.query.toLowerCase()
      if (picker.kind === '@') {
        const matches = customers.filter((c) => {
          if (!lc) return true
          return (
            c.name.toLowerCase().includes(lc) ||
            c.email.toLowerCase().includes(lc) ||
            (c.company ?? '').toLowerCase().includes(lc)
          )
        })
        return matches.slice(0, 6).map((c) => ({
          id: c.id,
          primary: c.name,
          secondary: c.company || c.email,
        }))
      }
      // #
      const matches = toolOptions.filter((t) => {
        if (!lc) return true
        return (
          t.trigger.toLowerCase().includes(lc) ||
          t.description.toLowerCase().includes(lc)
        )
      })
      return matches.slice(0, 6).map((t) => ({
        id: t.id,
        primary: t.trigger,
        secondary: t.description,
      }))
    }, [picker, customers, toolOptions])

    function detectPicker(text: string, cursor: number): PickerState {
      // Walk backwards from cursor looking for @ or # not preceded by a word char
      let i = cursor - 1
      let kind: PickerKind | null = null
      let triggerStart = -1
      while (i >= 0) {
        const ch = text[i]
        if (ch === '@' || ch === '#') {
          const prev = i > 0 ? text[i - 1] : ' '
          if (!/\w/.test(prev)) {
            kind = ch as PickerKind
            triggerStart = i
            break
          } else {
            return CLOSED
          }
        }
        if (/\s/.test(ch)) break // hit whitespace — no trigger in this token
        i--
      }
      if (!kind) return CLOSED
      const query = text.slice(triggerStart + 1, cursor)
      // For '#customer' multi-word triggers we still want to keep the picker
      // open while the user types ' add' / ' edit'; only break on a 2nd space
      if (kind === '@' && /\s/.test(query)) return CLOSED
      if (kind === '#' && query.split(/\s+/).length > 2) return CLOSED
      return {
        open: true,
        kind,
        query,
        triggerStart,
        selectedIdx: 0,
      }
    }

    function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
      const next = e.target.value
      onChange(next)
      const cursor = e.target.selectionStart ?? next.length
      setPicker(detectPicker(next, cursor))
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (picker.open) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setPicker(CLOSED)
          return
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setPicker((p) => ({
            ...p,
            selectedIdx: Math.min(filtered.length - 1, p.selectedIdx + 1),
          }))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setPicker((p) => ({
            ...p,
            selectedIdx: Math.max(0, p.selectedIdx - 1),
          }))
          return
        }
        if ((e.key === 'Enter' || e.key === 'Tab') && filtered[picker.selectedIdx]) {
          e.preventDefault()
          selectOption(filtered[picker.selectedIdx])
          return
        }
      }
      if (e.key === 'Enter' && !e.shiftKey && !picker.open) {
        e.preventDefault()
        onSubmit()
      }
    }

    function selectOption(option: { id: string; primary: string }) {
      if (!picker.open || picker.kind === null) return
      const ta = textareaRef.current
      const cursor = ta?.selectionStart ?? value.length
      const before = value.slice(0, picker.triggerStart)
      const after = value.slice(cursor)
      let insertion: string
      if (picker.kind === '@') {
        insertion = `@${option.primary} `
      } else {
        // option.primary already includes the leading '#'
        insertion = `${option.primary} `
      }
      const newValue = before + insertion + after
      onChange(newValue)
      setPicker(CLOSED)
      // Restore caret after the insertion
      const newCursor = (before + insertion).length
      requestAnimationFrame(() => {
        ta?.focus()
        ta?.setSelectionRange(newCursor, newCursor)
      })
    }

    return (
      <div className="relative w-full">
        {picker.open && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-lg border border-[var(--brand-border)] bg-[var(--surface-elevated)] shadow-lg">
            <div className="px-3 py-2 border-b border-[var(--brand-border)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {picker.kind === '@' ? (
                <AtSign className="h-3 w-3" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
              <span>
                {picker.kind === '@' ? 'Customers' : 'Tools'}
                {picker.query ? ` matching "${picker.query}"` : ''}
              </span>
            </div>
            <ul role="listbox">
              {filtered.map((opt, idx) => {
                const active = idx === picker.selectedIdx
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseDown={(e) => {
                        // mousedown so we beat textarea blur
                        e.preventDefault()
                        selectOption(opt)
                      }}
                      onMouseEnter={() =>
                        setPicker((p) => ({ ...p, selectedIdx: idx }))
                      }
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5',
                        active && 'bg-[var(--surface)]',
                      )}
                    >
                      <span
                        className={cn(
                          'font-medium',
                          picker.kind === '#' && 'font-mono',
                        )}
                      >
                        {opt.primary}
                      </span>
                      {opt.secondary && (
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          {opt.secondary}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Highlight mirror — sits behind the transparent textarea text */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg px-2.5 py-2 text-sm whitespace-pre-wrap break-words leading-normal text-foreground"
        >
          {tokenizeText(value).map((tok, i) => {
            if (tok.type === 'action') {
              return (
                <span key={i} className="font-bold text-violet-400">
                  {tok.text}
                </span>
              )
            }
            if (tok.type === 'mention') {
              return (
                <span key={i} className="font-bold text-cyan-400">
                  {tok.text}
                </span>
              )
            }
            return <span key={i}>{tok.text}</span>
          })}
          {/* trailing space keeps height stable on the last line */}
          {' '}
        </div>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="min-h-11 max-h-48 resize-none w-full relative"
          style={{ color: 'transparent', caretColor: 'hsl(var(--foreground))' }}
          disabled={disabled}
        />
      </div>
    )
  },
)
