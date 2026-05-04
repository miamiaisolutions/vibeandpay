import { NextResponse, type NextRequest } from 'next/server'
import { generateText } from 'ai'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { claudeSonnet } from '@/lib/ai/client'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id: threadId } = await params

  const threadRef = adminDb
    .collection('merchants')
    .doc(uid)
    .collection('threads')
    .doc(threadId)
  const threadSnap = await threadRef.get()
  if (!threadSnap.exists) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }
  // Skip if title already set
  const existing = threadSnap.data()?.title
  if (typeof existing === 'string' && existing.trim().length > 0) {
    return NextResponse.json({ ok: true, skipped: true, title: existing })
  }

  // Pull first 6 messages for context
  const msgsSnap = await threadRef
    .collection('messages')
    .orderBy('sequence', 'asc')
    .limit(6)
    .get()

  const lines: string[] = []
  for (const doc of msgsSnap.docs) {
    const data = doc.data() as {
      role: string
      parts: Array<{ type: string; text?: string }>
    }
    const text = (data.parts ?? [])
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join(' ')
      .trim()
    if (text) lines.push(`${data.role}: ${text}`)
  }

  if (lines.length === 0) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const prompt = `Summarize the conversation below as a 3-5 word title in sentence case. No quotes, no period at the end. Just the title.

Conversation:
${lines.join('\n')}

Title:`

  let title = ''
  try {
    const result = await generateText({
      model: claudeSonnet,
      prompt,
      maxOutputTokens: 24,
    })
    title = result.text.trim().replace(/^["']|["']$/g, '').replace(/[.!?]+$/, '')
  } catch (err) {
    console.error('[title] generation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Title generation failed' },
      { status: 500 },
    )
  }

  if (!title) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  await threadRef.update({
    title,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ ok: true, title })
}
