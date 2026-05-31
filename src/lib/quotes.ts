import { QUOTES, quoteForDay } from './data'
import { dayKey } from './utils'

export interface ApiQuote {
  text: string
  author: string
}

const DAILY_KEY = 'td-daily-quote'

/** Stable key for de-duping / favoriting (API ids differ from local ones). */
export function quoteKey(q: ApiQuote): string {
  return q.text.trim().toLowerCase()
}

function localRandom(): ApiQuote {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  return { text: q.text, author: q.author }
}

/** Deterministic offline quote for today (used as instant fallback). */
export function localDailyQuote(): ApiQuote {
  const q = quoteForDay(dayKey())
  return { text: q.text, author: q.author }
}

/** Fetch a fresh random quote from the free API; fall back to local on failure. */
export async function fetchRandomQuote(signal?: AbortSignal): Promise<ApiQuote> {
  try {
    const res = await fetch('https://dummyjson.com/quotes/random', { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const d = await res.json()
    if (!d?.quote) throw new Error('malformed')
    return { text: d.quote, author: d.author || 'Unknown' }
  } catch {
    return localRandom()
  }
}

/** Today's quote — cached per day in localStorage so it stays stable and works offline. */
export async function getDailyQuote(signal?: AbortSignal): Promise<ApiQuote> {
  const today = dayKey()
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as { day: string; quote: ApiQuote }
      if (cached.day === today && cached.quote?.text) return cached.quote
    }
  } catch {
    /* ignore */
  }
  const q = await fetchRandomQuote(signal)
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify({ day: today, quote: q }))
  } catch {
    /* ignore */
  }
  return q
}
