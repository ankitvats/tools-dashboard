import { useEffect, useState } from 'react'
import { getDailyQuote, localDailyQuote, type ApiQuote } from '@/lib/quotes'

/** Today's quote: renders local fallback immediately, then swaps in the cached/API one. */
export function useDailyQuote(): ApiQuote {
  const [quote, setQuote] = useState<ApiQuote>(() => localDailyQuote())
  useEffect(() => {
    const ctrl = new AbortController()
    getDailyQuote(ctrl.signal).then((q) => setQuote(q)).catch(() => {})
    return () => ctrl.abort()
  }, [])
  return quote
}
