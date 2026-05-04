import { streamText, convertToModelMessages, isLoopFinished, type UIMessage } from 'ai'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { claudeSonnet } from '@/lib/ai/client'
import { buildSystemPrompt } from '@/lib/ai/systemPrompt'
import { makeTools } from '@/lib/ai/tools'

export const maxDuration = 60

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7).trim())
    uid = decoded.uid
  } catch {
    return new Response('Invalid token', { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    messages?: UIMessage[]
  } | null
  if (!body?.messages) {
    return new Response('Missing messages', { status: 400 })
  }

  const merchantSnap = await adminDb.collection('merchants').doc(uid).get()
  const merchant = (merchantSnap.data() ?? {}) as Record<string, unknown>

  const system = buildSystemPrompt({
    merchantName: String(merchant.displayName ?? 'merchant'),
    businessName: String(merchant.businessName ?? ''),
    language: (merchant.language as 'en' | 'es') ?? 'en',
    hasNorthCredentials: Boolean(merchant.northCredentialsCipher),
  })

  const tools = makeTools(uid)

  const result = streamText({
    model: claudeSonnet,
    system,
    messages: await convertToModelMessages(body.messages),
    tools,
    stopWhen: isLoopFinished(),
  })

  return result.toUIMessageStreamResponse()
}
