'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

const PHRASES = [
  'Reading the room…',
  'Crunching numbers…',
  'Drafting it up…',
  'Checking the books…',
  'Lining things up…',
  'Thinking…',
]

export function ThinkingSpinner() {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * PHRASES.length),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{PHRASES[index]}</span>
    </div>
  )
}
