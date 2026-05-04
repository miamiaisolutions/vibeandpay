export type Token = { text: string; type: 'action' | 'mention' | 'plain' }

/**
 * Splits a chat string into styled tokens.
 *  #checkout  → action  (violet)
 *  @Miami AI Solutions → mention (cyan)
 *  everything else     → plain
 *
 * Mention heuristic: @ followed by one or more words where
 * continuation words start with an uppercase letter, matching
 * how the picker inserts proper-cased business/customer names.
 */
export function tokenizeText(input: string): Token[] {
  const tokens: Token[] = []
  // The @ form only counts as a mention when it's at the start of a word —
  // i.e. preceded by whitespace, start-of-string, or punctuation. The
  // negative lookbehind keeps email-address local parts ("test@gmail.com")
  // from being chopped up as mentions.
  const regex = /(#\S+|(?<![A-Za-z0-9._%+-])@[A-Za-z0-9][A-Za-z0-9]*(?:\s[A-Z][A-Za-z0-9]*)*)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(input)) !== null) {
    if (match.index > last) {
      tokens.push({ text: input.slice(last, match.index), type: 'plain' })
    }
    const raw = match[0]
    tokens.push({ text: raw, type: raw.startsWith('#') ? 'action' : 'mention' })
    last = match.index + raw.length
  }

  if (last < input.length) {
    tokens.push({ text: input.slice(last), type: 'plain' })
  }

  return tokens
}
