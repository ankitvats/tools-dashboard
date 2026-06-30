import { dayKey } from './utils'
import { COMMON_WORDS } from './common-words'

// ── Types (normalized from api.dictionaryapi.dev) ─────────
export interface WordDefinition {
  definition: string
  example?: string
  synonyms: string[]
  antonyms: string[]
}
export interface WordMeaning {
  partOfSpeech: string
  definitions: WordDefinition[]
  synonyms: string[]
  antonyms: string[]
}
export interface WordEntry {
  word: string
  phonetic?: string
  audio?: string
  meanings: WordMeaning[]
  /** short summary shown on the tile — first definition */
  summary: string
}

const DAILY_KEY = 'td-daily-word-v3'
const API = 'https://api.dictionaryapi.dev/api/v2/entries/en'

const POOL = COMMON_WORDS

/** Stable key for favoriting. */
export function wordKey(w: WordEntry | string): string {
  return (typeof w === 'string' ? w : w.word).trim().toLowerCase()
}

/** A shuffled copy of the pool — lets us walk distinct candidates without repeats. */
function shuffledPool(): string[] {
  const a = [...POOL]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Normalize a raw API entry array into our shape. */
function normalize(word: string, raw: any[]): WordEntry {
  let phonetic: string | undefined
  let audio: string | undefined
  for (const e of raw) {
    if (!phonetic && e.phonetic) phonetic = e.phonetic
    for (const p of e.phonetics ?? []) {
      if (!phonetic && p.text) phonetic = p.text
      if (!audio && p.audio) audio = p.audio
    }
  }
  const meanings: WordMeaning[] = []
  for (const e of raw) {
    for (const m of e.meanings ?? []) {
      meanings.push({
        partOfSpeech: m.partOfSpeech ?? '',
        synonyms: m.synonyms ?? [],
        antonyms: m.antonyms ?? [],
        definitions: (m.definitions ?? []).map((d: any) => ({
          definition: d.definition ?? '',
          example: d.example,
          synonyms: d.synonyms ?? [],
          antonyms: d.antonyms ?? [],
        })),
      })
    }
  }
  // The API sometimes lists an obscure homograph first (e.g. "between" → a sewing
  // needle, before the preposition). Lead with the dominant sense — the meaning
  // carrying the most definitions — so the word and its summary actually match.
  if (meanings.length > 1) {
    const best = meanings.reduce((bi, m, i, arr) => (m.definitions.length > arr[bi].definitions.length ? i : bi), 0)
    if (best > 0) meanings.unshift(meanings.splice(best, 1)[0])
  }
  const summary = meanings[0]?.definitions[0]?.definition ?? ''
  return { word, phonetic, audio: audio?.startsWith('//') ? `https:${audio}` : audio, meanings, summary }
}

/** Fetch full entry for a word from the free dictionary API. */
export async function fetchWord(word: string, signal?: AbortSignal): Promise<WordEntry> {
  const res = await fetch(`${API}/${encodeURIComponent(word)}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data) || !data.length) throw new Error('malformed')
  return normalize(word, data)
}

/**
 * A fresh word drawn from the 1000-most-common list. We walk a shuffled copy and
 * return the first word that has a dictionary entry (a few common words lack one),
 * trying up to 12 candidates before giving up.
 */
export async function fetchRandomWord(signal?: AbortSignal): Promise<WordEntry> {
  const candidates = shuffledPool().slice(0, 12)
  for (const w of candidates) {
    try {
      return await fetchWord(w, signal)
    } catch (e) {
      if (signal?.aborted) throw e
      // no definition for this word — try the next candidate
    }
  }
  throw new Error('no word available')
}

/** Today's word entry — cached per day in localStorage so it stays stable across the day. */
export async function getDailyWord(signal?: AbortSignal): Promise<WordEntry> {
  const today = dayKey()
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as { day: string; entry: WordEntry }
      if (cached.day === today && cached.entry?.word) return cached.entry
    }
  } catch {
    /* ignore */
  }
  const entry = await fetchRandomWord(signal)
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify({ day: today, entry }))
  } catch {
    /* ignore */
  }
  return entry
}
