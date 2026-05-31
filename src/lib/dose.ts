import { dayKey } from './utils'
import { AFFIRMATIONS } from './affirmations'

// ── Types ─────────────────────────────────────────────────
export type DoseKind = 'advice' | 'fact' | 'joke' | 'affirmation'

export interface Dose {
  kind: DoseKind
  /** primary line (advice text / fact / joke or setup) */
  text: string
  /** joke punchline (two-part jokes only) */
  punchline?: string
}

// ── Offline fallbacks (used only if an API is unreachable) ─
const FALLBACK: Record<DoseKind, Dose> = {
  advice: { kind: 'advice', text: 'Drink a glass of water — your brain is mostly water and it shows.' },
  fact: { kind: 'fact', text: 'Honey never spoils; edible pots have been found in ancient tombs.' },
  joke: { kind: 'joke', text: 'Why do programmers prefer dark mode?', punchline: 'Because light attracts bugs.' },
  affirmation: { kind: 'affirmation', text: 'You are capable, and today is yours to shape.' },
}

const ADVICE_API = 'https://api.adviceslip.com/advice'
const FACT_API = 'https://uselessfacts.jsph.pl/api/v2/facts/random'
const JOKE_API = 'https://v2.jokeapi.dev/joke/Any?safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit'

/** Fetch a fresh item of the given kind; falls back to a built-in on failure. */
export async function fetchDose(kind: DoseKind, signal?: AbortSignal): Promise<Dose> {
  try {
    if (kind === 'advice') {
      // cache-bust: adviceslip caches per-request without it
      const res = await fetch(`${ADVICE_API}?t=${Date.now()}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      const text = d?.slip?.advice
      if (!text) throw new Error('malformed')
      return { kind, text }
    }
    if (kind === 'fact') {
      const res = await fetch(`${FACT_API}?language=en`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      if (!d?.text) throw new Error('malformed')
      return { kind, text: d.text }
    }
    if (kind === 'affirmation') {
      // local list — no API/CORS, instant, offline
      return { kind, text: AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)] }
    }
    // joke
    const res = await fetch(JOKE_API, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const d = await res.json()
    if (d?.error) throw new Error('api error')
    if (d.type === 'twopart') return { kind, text: d.setup, punchline: d.delivery }
    if (d.joke) return { kind, text: d.joke }
    throw new Error('malformed')
  } catch (e) {
    if (signal?.aborted) throw e
    return FALLBACK[kind]
  }
}

/** Today's item for a kind — cached per day in localStorage so it stays stable. */
export async function getDailyDose(kind: DoseKind, signal?: AbortSignal): Promise<Dose> {
  const today = dayKey()
  const key = `td-daily-dose-${kind}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const cached = JSON.parse(raw) as { day: string; dose: Dose }
      if (cached.day === today && cached.dose?.text) return cached.dose
    }
  } catch {
    /* ignore */
  }
  const dose = await fetchDose(kind, signal)
  try {
    localStorage.setItem(key, JSON.stringify({ day: today, dose }))
  } catch {
    /* ignore */
  }
  return dose
}
