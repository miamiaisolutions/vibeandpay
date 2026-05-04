'use client'

import { useMemo } from 'react'
import { ChatThread } from '@/components/chat/ChatThread'

export default function NewChatPage() {
  // Each fresh visit to /chat starts a new persisted thread. The ID is
  // generated client-side; the thread doc is created on the first message
  // by /api/threads/sync.
  const threadId = useMemo(
    () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36),
    [],
  )
  return <ChatThread threadId={threadId} />
}
