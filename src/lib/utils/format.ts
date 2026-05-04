type FirestoreTimestampLike = {
  toDate: () => Date
}

type DateInput =
  | Date
  | FirestoreTimestampLike
  | { _seconds: number; _nanoseconds: number }
  | null
  | undefined

function coerceDate(input: DateInput): Date | null {
  if (!input) return null
  if (input instanceof Date) return input
  if (typeof (input as FirestoreTimestampLike).toDate === 'function') {
    return (input as FirestoreTimestampLike).toDate()
  }
  if (typeof (input as { _seconds: number })._seconds === 'number') {
    return new Date((input as { _seconds: number })._seconds * 1000)
  }
  return null
}

export function formatCurrency(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatDate(input: DateInput, locale = 'en-US'): string {
  const d = coerceDate(input)
  if (!d) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d)
}

export function formatRelativeTime(input: DateInput, locale = 'en-US'): string {
  const d = coerceDate(input)
  if (!d) return '—'
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 0) return 'in the future'
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 86_400 * 7) return `${Math.floor(seconds / 86_400)}d ago`
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(d)
}
