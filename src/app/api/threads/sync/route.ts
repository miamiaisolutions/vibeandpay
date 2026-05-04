import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const Body = z.object({
  threadId: z.string().min(1),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        parts: z.array(z.any()),
      }),
    )
    .min(1),
})

function previewFromMessage(msg: {
  role: 'user' | 'assistant' | 'system'
  parts: Array<{ type: string; text?: string }>
}): string {
  const text = msg.parts.find((p) => p.type === 'text')?.text ?? ''
  return text.slice(0, 140).trim()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }
  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { threadId, messages } = parsed.data

  const threadRef = adminDb
    .collection('merchants')
    .doc(uid)
    .collection('threads')
    .doc(threadId)
  const threadSnap = await threadRef.get()
  const isNew = !threadSnap.exists

  const lastMsg = messages[messages.length - 1]
  const lastMessagePreview = previewFromMessage(lastMsg as {
    role: 'user' | 'assistant' | 'system'
    parts: Array<{ type: string; text?: string }>
  })

  if (isNew) {
    await threadRef.set({
      title: '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastMessagePreview,
      messageCount: messages.length,
    })
  } else {
    await threadRef.update({
      updatedAt: FieldValue.serverTimestamp(),
      lastMessagePreview,
      messageCount: messages.length,
    })
  }

  const batch = adminDb.batch()
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const msgRef = threadRef.collection('messages').doc(msg.id)
    batch.set(
      msgRef,
      {
        role: msg.role,
        parts: msg.parts,
        sequence: i,
      },
      { merge: true },
    )
  }
  await batch.commit()

  return NextResponse.json({ ok: true, isNew, messageCount: messages.length })
}
