'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useTranslations } from 'next-intl'
import { ArrowUp } from 'lucide-react'
import { auth, db } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { ThinkingSpinner } from '@/components/chat/ThinkingSpinner'
import { ToolMessage, type WriteToolOutput } from '@/components/chat/ToolMessage'
import { MentionInput } from '@/components/chat/MentionInput'
import { tokenizeText } from '@/components/chat/tokenizeText'
import { Markdown } from '@/components/chat/Markdown'
import type { ConfirmationStatus } from '@/components/chat/ConfirmationCard'
import { formatCurrency } from '@/lib/utils/format'

const SUGGESTION_KEYS = ['suggestion1', 'suggestion2', 'suggestion3'] as const

type ConfirmState = { status: ConfirmationStatus; message?: string }

type ExecuteResult = {
  paymentUrl?: string
  emailSent?: boolean
  customerId?: string
  transactionId?: string
}

type Props = {
  threadId: string
  initialMessages?: UIMessage[]
}

export function ChatThread({ threadId, initialMessages = [] }: Props) {
  const t = useTranslations('Chat')
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        fetch: async (url, init) => {
          const token = await auth.currentUser?.getIdToken()
          return fetch(url, {
            ...init,
            headers: {
              ...(init?.headers ?? {}),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
        },
      }),
    [],
  )

  const { messages, setMessages, sendMessage, status, error } = useChat({ transport })

  // Hydrate from Firestore-loaded messages on mount.
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    if (initialMessages.length > 0) setMessages(initialMessages)
    hydratedRef.current = true
  }, [initialMessages, setMessages])

  // Track auth state so we can subscribe to live system messages.
  const [user, setUser] = useState<User | null>(auth.currentUser)
  useEffect(() => onAuthStateChanged(auth, setUser), [])

  // Live system messages from polling cron (e.g. "✅ Beth just paid $640").
  // Append any new ones into the chat state, deduping against already-present IDs.
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'merchants', user.uid, 'threads', threadId, 'messages'),
      where('role', '==', 'system'),
    )
    return onSnapshot(q, (snap) => {
      const additions: UIMessage[] = []
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return
        const data = change.doc.data() as { parts?: UIMessage['parts'] }
        if (!data.parts) return
        additions.push({
          id: change.doc.id,
          role: 'system',
          parts: data.parts,
        })
      })
      if (additions.length === 0) return
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id))
        const fresh = additions.filter((m) => !seen.has(m.id))
        return fresh.length > 0 ? [...prev, ...fresh] : prev
      })
    })
  }, [user, threadId, setMessages])

  const [input, setInput] = useState('')
  const [confirmStates, setConfirmStates] = useState<Record<string, ConfirmState>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // Persist thread on every completed turn. Trigger auto-title after the
  // first assistant response.
  const lastSyncedCountRef = useRef(initialMessages.length)
  const titleKickedRef = useRef(initialMessages.length > 0)
  useEffect(() => {
    if (status !== 'ready') return
    if (messages.length === 0) return
    if (messages.length <= lastSyncedCountRef.current) return
    lastSyncedCountRef.current = messages.length
    void persistThread(threadId, messages, titleKickedRef)
  }, [status, messages, threadId])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, status])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    sendMessage({ text: trimmed })
    setInput('')
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    submit(input)
  }

  async function handleConfirm(
    type: WriteToolOutput['type'],
    toolCallId: string,
    output: WriteToolOutput,
    edited: Record<string, string | number>,
  ) {
    setConfirmStates((s) => ({ ...s, [toolCallId]: { status: 'loading' } }))
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) throw new Error('Not signed in.')
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      }

      let url: string
      let method: 'POST' | 'PATCH' = 'POST'
      let body: Record<string, unknown>
      let successMessage = (_result: ExecuteResult) => `Done — ${output.type}`

      switch (output.type) {
        case 'createCheckout': {
          url = '/api/transactions/checkout'
          const editedAmount = Number(edited.amount ?? output.data.amount)
          const editedEmail = String(edited.email ?? output.data.customerEmail)
          body = {
            customerId: output.data.customerId,
            customerName: output.data.customerName,
            customerEmail: editedEmail,
            amount: editedAmount,
            lineItems: output.data.lineItems,
            threadId,
          }
          successMessage = (r) =>
            r.emailSent === false
              ? `Link created for ${output.data.customerName} — ${formatCurrency(editedAmount)} (email failed; share ${r.paymentUrl})`
              : `Sent to ${output.data.customerName} — ${formatCurrency(editedAmount)}`
          break
        }
        case 'createInvoice': {
          url = '/api/transactions/invoice'
          const editedAmount = Number(edited.amount ?? output.data.amount)
          const editedEmail = String(edited.email ?? output.data.customerEmail)
          const editedDue = String(edited.dueDate ?? output.data.dueDate)
          body = {
            customerId: output.data.customerId,
            customerName: output.data.customerName,
            customerEmail: editedEmail,
            amount: editedAmount,
            lineItems: output.data.lineItems,
            dueDate: editedDue,
            threadId,
          }
          successMessage = (r) =>
            r.emailSent === false
              ? `Invoice created — ${formatCurrency(editedAmount)} (email pending; share ${r.paymentUrl})`
              : `Invoice sent to ${output.data.customerName} — ${formatCurrency(editedAmount)}, due ${editedDue}`
          break
        }
        case 'createPaymentLink': {
          url = '/api/transactions/payment-link'
          const editedAmount = Number(edited.amount ?? output.data.amount)
          const editedLabel = String(edited.label ?? output.data.label)
          body = {
            amount: editedAmount,
            label: editedLabel,
            customerId: output.data.customerId,
            threadId,
          }
          successMessage = (r) =>
            `Payment link ready — ${formatCurrency(editedAmount)} · ${r.paymentUrl ?? ''}`
          break
        }
        case 'addCustomer': {
          url = '/api/customers'
          body = {
            name: String(edited.name ?? output.data.name),
            email: String(edited.email ?? output.data.email),
            phone:
              edited.phone === undefined ? output.data.phone : String(edited.phone),
            company:
              edited.company === undefined ? output.data.company : String(edited.company),
            preferredLanguage: String(
              edited.preferredLanguage ?? output.data.preferredLanguage,
            ),
          }
          successMessage = () => `Added ${output.data.name}`
          break
        }
        case 'updateCustomer': {
          url = `/api/customers/${output.data.customerId}`
          method = 'PATCH'
          const patch: Record<string, unknown> = {}
          for (const entry of output.data.diff) {
            const next = edited[entry.field]
            patch[entry.field] = next ?? entry.after
          }
          body = patch
          successMessage = () => `Updated ${output.data.customerName}`
          break
        }
        case 'refundTransaction': {
          url = `/api/transactions/${output.data.transactionId}/refund`
          const refundAmount = Number(edited.amount ?? output.data.refundAmount)
          body = {
            amount: refundAmount,
            reason: String(edited.reason ?? output.data.reason),
          }
          successMessage = () =>
            `Refunded ${formatCurrency(refundAmount)} to ${output.data.customerName}`
          break
        }
        case 'voidTransaction': {
          url = `/api/transactions/${output.data.transactionId}/void`
          body = {
            reason: String(edited.reason ?? output.data.reason),
          }
          successMessage = () =>
            `Voided ${output.data.customerName}'s pending ${formatCurrency(output.data.amount)}`
          break
        }
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      })
      const result = (await res.json().catch(() => ({}))) as ExecuteResult & {
        error?: string
      }
      if (!res.ok) throw new Error(result.error ?? 'Action failed.')

      setConfirmStates((s) => ({
        ...s,
        [toolCallId]: { status: 'confirmed', message: successMessage(result) },
      }))
    } catch (err) {
      setConfirmStates((s) => ({
        ...s,
        [toolCallId]: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Action failed.',
        },
      }))
    }
  }

  function handleCancel(toolCallId: string) {
    setConfirmStates((s) => ({ ...s, [toolCallId]: { status: 'cancelled' } }))
  }

  const isEmpty = messages.length === 0
  const isStreaming = status === 'submitted' || status === 'streaming'

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {isEmpty ? (
          <EmptyState onPick={(text) => submit(text)} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                confirmStates={confirmStates}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            ))}
            {isStreaming && (
              <div className="flex max-w-3xl">
                <div className="ml-2">
                  <ThinkingSpinner />
                </div>
              </div>
            )}
            {error && (
              <div role="alert" className="text-sm text-[var(--danger)]">
                {error.message}
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-[var(--brand-border)] bg-[var(--bg)] px-4 md:px-8 py-4"
      >
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <MentionInput
            value={input}
            onChange={setInput}
            onSubmit={() => submit(input)}
            disabled={isStreaming}
            placeholder={t('placeholder')}
          />
          <Button type="submit" size="default" disabled={isStreaming || !input.trim()}>
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">{t('send')}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}

async function persistThread(
  threadId: string,
  messages: UIMessage[],
  titleKickedRef: React.MutableRefObject<boolean>,
) {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
    await fetch('/api/threads/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        threadId,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          parts: m.parts,
        })),
      }),
    })
    if (!titleKickedRef.current) {
      titleKickedRef.current = true
      // Fire-and-forget; if it fails the thread just stays "Untitled".
      void fetch(`/api/threads/${threadId}/title`, {
        method: 'POST',
        headers,
      })
    }
  } catch (err) {
    console.error('[thread sync] failed:', err)
  }
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const t = useTranslations('Chat')
  return (
    <div className="max-w-2xl mx-auto pt-12 md:pt-24 text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('emptyHeadline')}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t('emptyHint')}</p>
      </div>
      <div className="flex flex-col gap-2 max-w-md mx-auto">
        {SUGGESTION_KEYS.map((key) => {
          const text = t(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(text)}
              className="text-left text-sm rounded-lg border border-[var(--brand-border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] px-4 py-3 transition-colors"
            >
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  confirmStates,
  onConfirm,
  onCancel,
}: {
  message: UIMessage
  confirmStates: Record<string, ConfirmState>
  onConfirm: (
    type: WriteToolOutput['type'],
    toolCallId: string,
    output: WriteToolOutput,
    edited: Record<string, string | number>,
  ) => void
  onCancel: (toolCallId: string) => void
}) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-xs text-[var(--text-muted)]">
          {message.parts.map((p, i) =>
            p.type === 'text' ? <span key={i}>{p.text}</span> : null,
          )}
        </div>
      </div>
    )
  }
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[80%] rounded-2xl bg-[var(--surface-elevated)] px-4 py-2.5 text-sm'
            : 'max-w-[90%] space-y-3'
        }
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            if (isUser) {
              return (
                <p key={i} className="text-sm whitespace-pre-wrap leading-relaxed">
                  {tokenizeText(part.text).map((tok, j) => {
                    if (tok.type === 'action') {
                      return (
                        <span key={j} className="font-bold text-violet-400">
                          {tok.text}
                        </span>
                      )
                    }
                    if (tok.type === 'mention') {
                      return (
                        <span key={j} className="font-bold text-cyan-400">
                          {tok.text}
                        </span>
                      )
                    }
                    return <span key={j}>{tok.text}</span>
                  })}
                </p>
              )
            }
            return <Markdown key={i}>{part.text}</Markdown>
          }
          if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
            const toolPart = part as unknown as Parameters<typeof ToolMessage>[0]['part']
            return (
              <ToolMessage
                key={i}
                part={toolPart}
                confirmState={confirmStates[toolPart.toolCallId]}
                onConfirm={onConfirm}
                onCancel={onCancel}
              />
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
