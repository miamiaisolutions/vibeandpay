'use client'

import { use, useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { Loader2 } from 'lucide-react'
import type { UIMessage } from 'ai'
import { auth, db } from '@/lib/firebase/client'
import { ChatThread } from '@/components/chat/ChatThread'

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<UIMessage[] | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const threadRef = doc(db, 'merchants', user.uid, 'threads', threadId)
        const threadSnap = await getDoc(threadRef)
        // A new thread (no doc yet) renders as an empty ChatThread; the
        // first message will create the doc via /api/threads/sync.
        if (!threadSnap.exists()) {
          if (!cancelled) setMessages([])
          return
        }
        const msgsSnap = await getDocs(
          query(
            collection(db, 'merchants', user.uid, 'threads', threadId, 'messages'),
            orderBy('sequence', 'asc'),
          ),
        )
        const loaded: UIMessage[] = msgsSnap.docs.map((d) => {
          const data = d.data() as {
            role: 'user' | 'assistant' | 'system'
            parts: UIMessage['parts']
          }
          return {
            id: d.id,
            role: data.role,
            parts: data.parts ?? [],
          }
        })
        if (!cancelled) setMessages(loaded)
      } catch (err) {
        console.error('[chat thread] load failed', err)
        if (!cancelled) setMessages([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, threadId])

  if (messages === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  return <ChatThread threadId={threadId} initialMessages={messages} />
}
