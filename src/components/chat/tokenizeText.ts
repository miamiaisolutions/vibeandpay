export type Token = { text: string; type: 'action' | 'mention' | 'product' | 'plain' }

/**
 * Splits a chat string into styled tokens.
 *  #checkout  → action  (violet)
 *  @Miami AI Solutions → mention (cyan)
 *  &Logo Package       → product (amber)
 *  everything else     → plain
 *
 * Mention/product heuristic: @ or & followed by one or more words where
 * continuation words start with an uppercase letter, matching how the
 * picker inserts proper-cased names.
 */
export function tokenizeText(input: string): Token[] {
  const tokens: Token[] = []
  // # — any non-whitespace run after #
  // @ — customer mention (not inside email addresses)
  // & — product mention (same shape as @mention)
  const regex = /(#\S+|(?<![A-Za-z0-9._%+-])@[A-Za-z0-9][A-Za-z0-9]*(?:\s[A-Z][A-Za-z0-9]*)*|(?<![A-Za-z0-9])&[A-Za-z0-9][A-Za-z0-9]*(?:\s[A-Z][A-Za-z0-9]*)*)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(input)) !== null) {
    if (match.index > last) {
      tokens.push({ text: input.slice(last, match.index), type: 'plain' })
    }
    const raw = match[0]
    let type: Token['type'] = 'plain'
    if (raw.startsWith('#')) type = 'action'
    else if (raw.startsWith('@')) type = 'mention'
    else if (raw.startsWith('&')) type = 'product'
    tokens.push({ text: raw, type })
    last = match.index + raw.length
  }

  if (last < input.length) {
    tokens.push({ text: input.slice(last), type: 'plain' })
  }

  return tokens
}
