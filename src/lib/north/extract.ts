// North's status response shape isn't strictly documented; the transaction
// identifier shows up under different keys in different account configs.
// Probe the common candidates and any nested object before giving up.
const TX_ID_KEYS = [
  'transactionId',
  'transId',
  'tranId',
  'paymentId',
  'orderId',
  'id',
] as const

export function extractNorthTransactionId(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null
  const r = obj as Record<string, unknown>
  for (const k of TX_ID_KEYS) {
    const v = r[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  // One level of nesting (e.g. response.transaction.id)
  for (const k of Object.keys(r)) {
    const v = r[k]
    if (v && typeof v === 'object') {
      const nested = extractNorthTransactionId(v)
      if (nested) return nested
    }
  }
  return null
}

export function sanitizeForFirestore(value: unknown): unknown {
  if (value === undefined) return null
  if (value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value
  if (Array.isArray(value)) return value.map(sanitizeForFirestore)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = sanitizeForFirestore(v)
    }
    return out
  }
  return null
}
