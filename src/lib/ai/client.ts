import 'server-only'
import { createAnthropic } from '@ai-sdk/anthropic'

// Pin the API base URL explicitly. The SDK respects ANTHROPIC_BASE_URL from
// the environment, and Claude Code's local shell exports it without the /v1
// suffix — that caused our requests to 404 against api.anthropic.com/messages
// instead of /v1/messages. Hard-coding this immunizes us against host-shell
// env contamination.
const anthropic = createAnthropic({
  baseURL: 'https://api.anthropic.com/v1',
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Sonnet 4.6 — current latest. (The original spec said 4.5, but Anthropic
// retired it. 4.6 is a drop-in upgrade.)
export const claudeSonnet = anthropic('claude-sonnet-4-6')
