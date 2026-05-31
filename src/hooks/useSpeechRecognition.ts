import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typings for the Web Speech API (not in the default DOM lib).
interface SREvent { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }
interface SRErrorEvent { error: string }
interface SpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SREvent) => void) | null
  onerror: ((e: SRErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
type SRConstructor = new () => SpeechRecognition

function getCtor(): SRConstructor | null {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

interface Options {
  /** called once a final transcript is ready */
  onResult: (transcript: string) => void
  lang?: string
}

export function useSpeechRecognition({ onResult, lang = 'en-US' }: Options) {
  const Ctor = getCtor()
  const supported = !!Ctor
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognition | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  // tear down on unmount
  useEffect(() => () => recRef.current?.abort(), [])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!Ctor) return
    setError(null)
    setInterim('')
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    recRef.current = rec

    rec.onstart = () => setListening(true)
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Microphone permission denied.' : e.error)
      setListening(false)
    }
    rec.onend = () => { setListening(false); setInterim('') }
    rec.onresult = (e) => {
      let final = ''
      let partial = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        const txt = r[0].transcript
        if (r.isFinal) final += txt
        else partial += txt
      }
      setInterim(partial)
      if (final.trim()) onResultRef.current(final.trim())
    }
    try { rec.start() } catch { /* already started */ }
  }, [Ctor, lang])

  return { supported, listening, interim, error, start, stop }
}
