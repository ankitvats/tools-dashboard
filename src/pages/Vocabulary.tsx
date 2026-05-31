import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, BookmarkPlus, Bookmark, Volume2, ChevronDown, ChevronUp, BookOpen, Share2 } from 'lucide-react'
import { Card, CardContent, Button, Badge, PageHeader } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { fetchRandomWord, getDailyWord, wordKey, type WordEntry } from '@/lib/dictionary'
import { useVocabulary } from '@/store/vocabulary'
import { cn } from '@/lib/utils'

export default function Vocabulary() {
  const { saved, toggleSaved } = useVocabulary()
  const { toast } = useToast()
  const [current, setCurrent] = useState<WordEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // load today's (cached) word from the API on mount
  useEffect(() => {
    const ctrl = new AbortController()
    getDailyWord(ctrl.signal)
      .then((w) => { setCurrent(w); setLoading(false) })
      .catch(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const refresh = async () => {
    setLoading(true)
    setExpanded(false)
    try {
      setCurrent(await fetchRandomWord())
    } catch {
      toast({ kind: 'warning', title: 'Could not fetch a new word — try again' })
    }
    setLoading(false)
  }

  const isSaved = current ? saved.some((f) => wordKey(f) === wordKey(current)) : false

  return (
    <div className="space-y-6">
      <PageHeader title="Word of the Day" subtitle="Grow your vocabulary, one word at a time." />

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={wordKey(current)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <WordCard
              entry={current}
              expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              saved={isSaved}
              onSave={() => toggleSaved(current)}
              onRefresh={refresh}
              loading={loading}
            />
          </motion.div>
        ) : (
          <Card>
            <CardContent className="grid place-items-center gap-2 py-16 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {loading ? 'Fetching today’s word…' : 'Couldn’t load a word.'}
              </p>
              {!loading && <Button onClick={refresh}><RefreshCw className="h-4 w-4" /> Try again</Button>}
            </CardContent>
          </Card>
        )}
      </AnimatePresence>

      <SavedWords />
    </div>
  )
}

function speak(audio: string | undefined, word: string, ref: React.RefObject<HTMLAudioElement>) {
  if (audio && ref.current) {
    ref.current.play().catch(() => fallbackSpeak(word))
  } else {
    fallbackSpeak(word)
  }
}
function fallbackSpeak(word: string) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    speechSynthesis.speak(u)
  }
}

function WordCard({
  entry, expanded, onToggleExpand, saved, onSave, onRefresh, loading,
}: {
  entry: WordEntry
  expanded: boolean
  onToggleExpand: () => void
  saved: boolean
  onSave: () => void
  onRefresh: () => void
  loading: boolean
}) {
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)

  const share = async () => {
    const payload = `${entry.word} (${entry.phonetic ?? ''}) — ${entry.summary}`
    try {
      if (navigator.share) await navigator.share({ text: payload })
      else { await navigator.clipboard.writeText(payload); toast({ kind: 'success', title: 'Copied to clipboard' }) }
    } catch { /* cancelled */ }
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-card">
      <CardContent className="p-6 sm:p-8">
        {/* Headword + phonetic + audio */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{entry.word}</h2>
          {entry.phonetic && <span className="font-mono text-lg text-muted-foreground">{entry.phonetic}</span>}
          <button
            onClick={() => speak(entry.audio, entry.word, audioRef)}
            className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25 focus-ring"
            aria-label="Play pronunciation"
          >
            <Volume2 className="h-5 w-5" />
          </button>
          {entry.audio && <audio ref={audioRef} src={entry.audio} preload="none" />}
        </div>

        {/* Part-of-speech chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.meanings.map((m, i) => (
            <Badge key={i} tone="primary" className="italic">{m.partOfSpeech}</Badge>
          ))}
        </div>

        {/* Primary definition */}
        <p className="mt-4 text-lg leading-snug text-balance">{entry.summary}</p>
        {entry.meanings[0]?.definitions[0]?.example && (
          <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
            “{entry.meanings[0].definitions[0].example}”
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant={expanded ? 'secondary' : 'default'} onClick={onToggleExpand}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? 'Less' : 'More'}
          </Button>
          <Button variant="outline" size="icon" onClick={onSave} aria-label="Save word">
            {saved ? <Bookmark className="h-5 w-5 fill-primary text-primary" /> : <BookmarkPlus className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={share} aria-label="Share">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={loading} className="ml-auto">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> New word
          </Button>
        </div>

        {/* In-depth, Cambridge-style breakdown */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <WordDetail entry={entry} />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

function WordDetail({ entry }: { entry: WordEntry }) {
  return (
    <div className="mt-6 space-y-6 border-t border-border pt-6">
      {entry.meanings.map((m, mi) => (
        <section key={mi}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
            <span className="italic">{m.partOfSpeech}</span>
            <span className="h-px flex-1 bg-border" />
          </h3>
          <ol className="space-y-3">
            {m.definitions.map((d, di) => (
              <li key={di} className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold tabular-nums">
                  {di + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{d.definition}</p>
                  {d.example && (
                    <p className="mt-1 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                      “{d.example}”
                    </p>
                  )}
                  {d.synonyms.length > 0 && (
                    <ChipRow label="Synonyms" items={d.synonyms} tone="success" />
                  )}
                  {d.antonyms.length > 0 && (
                    <ChipRow label="Antonyms" items={d.antonyms} tone="destructive" />
                  )}
                </div>
              </li>
            ))}
          </ol>

          {(m.synonyms.length > 0 || m.antonyms.length > 0) && (
            <div className="mt-3 space-y-1.5">
              {m.synonyms.length > 0 && <ChipRow label="Synonyms" items={m.synonyms} tone="success" />}
              {m.antonyms.length > 0 && <ChipRow label="Antonyms" items={m.antonyms} tone="destructive" />}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function ChipRow({ label, items, tone }: { label: string; items: string[]; tone: 'success' | 'destructive' }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      {items.slice(0, 8).map((s) => (
        <Badge key={s} tone={tone}>{s}</Badge>
      ))}
    </div>
  )
}

function SavedWords() {
  const { saved, toggleSaved } = useVocabulary()
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Bookmark className="h-4 w-4 text-primary" /> Saved words
        <span className="text-sm font-normal text-muted-foreground">({saved.length})</span>
      </h3>
      {saved.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center py-10 text-center">
            <p className="text-sm text-muted-foreground">No saved words yet. Tap the bookmark to keep words you want to remember.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {saved.map((w) => (
            <Card key={wordKey(w)}>
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-lg font-bold">{w.word}</h4>
                    {w.phonetic && <span className="font-mono text-xs text-muted-foreground">{w.phonetic}</span>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => toggleSaved(w)} aria-label="Remove">
                    <Bookmark className="h-4 w-4 fill-primary text-primary" />
                  </Button>
                </div>
                {w.meanings[0] && (
                  <p className="mt-0.5 text-xs italic text-muted-foreground">{w.meanings[0].partOfSpeech}</p>
                )}
                <p className="mt-1.5 text-sm leading-snug">{w.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
