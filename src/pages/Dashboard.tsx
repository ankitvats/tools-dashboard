import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Timer, ArrowRight, CalendarClock, Quote as QuoteIcon, Plus, GlassWater, RefreshCw, BookOpen, Volume2, Lightbulb, Sparkles, Laugh, Eye, Heart, Mic, MicOff } from 'lucide-react'
import { Card, CardContent, Progress, Button, Input } from '@/components/ui/primitives'
import { PomodoroPanel } from '@/components/PomodoroPanel'
import { useStats } from '@/hooks/useStats'
import { useNow, greeting } from '@/hooks/useNow'
import { useSettings } from '@/store/settings'
import { useTasks } from '@/store/tasks'
import { useWater } from '@/store/water'
import { useToast } from '@/components/ui/toast'
import { useDailyQuote } from '@/hooks/useDailyQuote'
import { fetchRandomQuote, type ApiQuote } from '@/lib/quotes'
import { fetchRandomWord, getDailyWord, type WordEntry } from '@/lib/dictionary'
import { getDailyDose, fetchDose, type Dose, type DoseKind } from '@/lib/dose'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { Appointment } from '@/lib/types'
import { isTaskDone, isToday } from '@/lib/tasks'
import { dayKey, pct, cn } from '@/lib/utils'

export default function Dashboard() {
  const now = useNow()
  const s = useStats()
  const userName = useSettings((st) => st.userName)
  const toggleTask = useTasks((st) => st.toggle)
  const dailyQuote = useDailyQuote()
  const [quoteOverride, setQuoteOverride] = useState<ApiQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const quote = quoteOverride ?? dailyQuote

  const newQuote = async () => {
    setQuoteLoading(true)
    setQuoteOverride(await fetchRandomQuote())
    setQuoteLoading(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header: greeting + inline world clocks */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight">
            {greeting(now)}{userName ? `, ${userName}` : ''} 👋
          </h1>
        </div>
        <WorldClocks now={now} />
      </div>

      {/* Row 1: Focus timer + Tasks */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Timer className="h-4 w-4" />
                </span>
                <h3 className="font-semibold">Focus timer</h3>
                {s.streaks.focus > 0 && <StreakBadge n={s.streaks.focus} />}
              </div>
              <Link to="/pomodoro" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
                Full view <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <PomodoroPanel compact />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <TasksSection onToggle={toggleTask} streak={s.streaks.tasks} />
        </div>
      </div>

      {/* Row 2: Appointments + Hydration + Motivation (3 equal columns) */}
      <div className="grid gap-5 lg:grid-cols-3">
        <AppointmentsSection today={s.apptsToday} upcoming={s.upcoming} />

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(199_89%_55%)]/15 text-[hsl(199_89%_55%)]">
                  <Droplets className="h-4 w-4" />
                </span>
                <h3 className="font-semibold">Hydration</h3>
                {s.streaks.water > 0 && <StreakBadge n={s.streaks.water} />}
              </div>
              <Link to="/water" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">{s.waterToday}</span>
              <span className="text-sm text-muted-foreground">/ {s.waterGoalMl} ml</span>
            </div>
            <Progress className="mt-2" value={pct(s.waterToday, s.waterGoalMl)} indicatorClass="bg-[hsl(199_89%_55%)]" />
            <p className="mt-1.5 text-xs text-muted-foreground">{Math.max(0, s.waterGoalMl - s.waterToday)} ml to go</p>
            <QuickWaterAdd />
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-accent/40 via-card to-card">
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
                <QuoteIcon className="h-4 w-4" />
              </span>
              <h3 className="font-semibold">Daily motivation</h3>
            </div>
            <blockquote className="mt-4 flex-1 text-base font-medium leading-snug text-balance">{quote.text}</blockquote>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="truncate text-sm text-muted-foreground">— {quote.author}</p>
              <Button size="sm" variant="outline" onClick={newQuote} disabled={quoteLoading}>
                <RefreshCw className={cn('h-3.5 w-3.5', quoteLoading && 'animate-spin')} /> New quote
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Word of the day */}
      <WordOfDayTile />

      {/* Row 4: Daily dose — affirmation, advice, fact, joke */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DoseCard kind="affirmation" />
        <DoseCard kind="advice" />
        <DoseCard kind="fact" />
        <DoseCard kind="joke" />
      </div>
    </div>
  )
}

function StreakBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-xs font-semibold text-orange-500">
      🔥{n}
    </span>
  )
}

const DOSE_META: Record<DoseKind, { title: string; icon: typeof Lightbulb; accent: string; iconWrap: string }> = {
  affirmation: { title: 'Affirmation', icon: Heart, accent: 'from-primary/10', iconWrap: 'bg-primary/15 text-primary' },
  advice: { title: 'Advice', icon: Lightbulb, accent: 'from-warning/10', iconWrap: 'bg-warning/15 text-warning' },
  fact: { title: 'Did you know?', icon: Sparkles, accent: 'from-[hsl(199_89%_55%)]/10', iconWrap: 'bg-[hsl(199_89%_55%)]/15 text-[hsl(199_89%_55%)]' },
  joke: { title: 'Joke', icon: Laugh, accent: 'from-success/10', iconWrap: 'bg-success/15 text-success' },
}

function DoseCard({ kind }: { kind: DoseKind }) {
  const meta = DOSE_META[kind]
  const Icon = meta.icon
  const [dose, setDose] = useState<Dose | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    getDailyDose(kind, ctrl.signal)
      .then((d) => { setDose(d); setLoading(false) })
      .catch(() => setLoading(false))
    return () => ctrl.abort()
  }, [kind])

  const refresh = async () => {
    setLoading(true)
    setRevealed(false)
    try { setDose(await fetchDose(kind)) } catch { /* keep current */ }
    setLoading(false)
  }

  return (
    <Card className={cn('flex h-full flex-col overflow-hidden bg-gradient-to-br via-card to-card', meta.accent)}>
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className={cn('grid h-7 w-7 place-items-center rounded-lg', meta.iconWrap)}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="font-semibold">{meta.title}</h3>
        </div>

        <div className="mt-4 min-h-[72px] flex-1">
          {dose ? (
            <>
              <p className="text-sm font-medium leading-snug text-balance">{dose.text}</p>
              {dose.punchline && (
                revealed ? (
                  <p className="mt-2.5 text-sm font-semibold leading-snug text-success">{dose.punchline}</p>
                ) : (
                  <Button variant="outline" size="sm" className="mt-2.5" onClick={() => setRevealed(true)}>
                    <Eye className="h-3.5 w-3.5" /> Reveal punchline
                  </Button>
                )
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : 'Couldn’t load.'}</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> New
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function WordOfDayTile() {
  const [entry, setEntry] = useState<WordEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false
    getDailyWord(ctrl.signal)
      .then((w) => { if (!cancelled) { setEntry(w); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; ctrl.abort() }
  }, [])

  const newWord = async () => {
    setLoading(true)
    try { setEntry(await fetchRandomWord()) } catch { /* keep current */ }
    setLoading(false)
  }

  const speak = () => {
    if (!entry) return
    if (entry.audio) new Audio(entry.audio).play().catch(() => synth(entry.word))
    else synth(entry.word)
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <h3 className="font-semibold">Word of the day</h3>
          </div>
          <Link to="/vocabulary" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
            More <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {entry ? (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-2xl font-bold tracking-tight">{entry.word}</span>
                {entry.phonetic && <span className="font-mono text-sm text-muted-foreground">{entry.phonetic}</span>}
                {entry.meanings[0] && <span className="text-xs italic text-muted-foreground">{entry.meanings[0].partOfSpeech}</span>}
                <button
                  onClick={speak}
                  className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25 focus-ring"
                  aria-label="Play pronunciation"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">{entry.summary}</p>
            </div>
            <Button size="sm" variant="outline" onClick={newWord} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> New word
            </Button>
          </div>
        ) : loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading today’s word…</p>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Couldn’t load a word.</p>
            <Button size="sm" variant="outline" onClick={newWord}>
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function synth(word: string) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    speechSynthesis.speak(u)
  }
}

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-muted-foreground/50',
  medium: 'bg-warning',
  high: 'bg-destructive',
}

/** Right-aligned due label + flags for color/sorting. */
function dueMeta(key?: string) {
  if (!key) return null
  const today = dayKey()
  const tomorrow = dayKey(new Date(Date.now() + 864e5))
  const label =
    key === today ? 'Today' : key === tomorrow ? 'Tomorrow' : new Date(key + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return { label, overdue: key < today, isToday: key === today }
}

/** bucket: 0 today, 1 upcoming, 2 overdue, 3 no date */
function dueBucket(key?: string): number {
  if (!key) return 3
  const today = dayKey()
  if (key === today) return 0
  return key > today ? 1 : 2
}

function TasksSection({ onToggle, streak }: { onToggle: (id: string) => void; streak: number }) {
  const tasks = useTasks((st) => st.tasks)
  const [tab, setTab] = useState<'today' | 'all'>('today')

  // Completed (for today) sink to the bottom; otherwise ordered by date bucket.
  // Daily recurring tasks share the "today" bucket so they stay at the top.
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const da = isTaskDone(a)
        const db = isTaskDone(b)
        if (da !== db) return da ? 1 : -1
        const ba = a.repeat === 'daily' ? 0 : dueBucket(a.dueDate)
        const bb = b.repeat === 'daily' ? 0 : dueBucket(b.dueDate)
        if (ba !== bb) return ba - bb
        if (ba === 1) return a.dueDate! < b.dueDate! ? -1 : 1 // upcoming soonest first
        if (ba === 2) return a.dueDate! > b.dueDate! ? -1 : 1 // overdue most recent first
        return a.order - b.order
      }),
    [tasks],
  )

  const todayCount = useMemo(() => tasks.filter((t) => isToday(t)).length, [tasks])
  const visible = useMemo(
    () => (tab === 'today' ? sorted.filter((t) => isToday(t)) : sorted),
    [sorted, tab],
  )
  const allTodayDone = tab === 'today' && visible.length > 0 && visible.every((t) => isTaskDone(t))

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex">
            {([
              { value: 'today', label: 'Today', count: todayCount },
              { value: 'all', label: 'All tasks', count: tasks.length },
            ] as const).map((t) => {
              const active = tab === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    '-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pr-4 text-sm font-medium transition-colors',
                    active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}>
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 pb-2.5">
            {streak > 0 && <StreakBadge n={streak} />}
            <Link to="/tasks" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {allTodayDone && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <span className="text-base">🎉</span>
            <span className="font-semibold">All done for today — great work!</span>
          </div>
        )}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
              {tab === 'today' ? 'No tasks due today. Add one below.' : 'No tasks yet. Add your first below.'}
            </div>
          ) : (
            <ul className="space-y-0.5">
            {visible.map((t) => {
              const done = isTaskDone(t)
              const due = t.repeat === 'daily' ? { label: 'Daily', overdue: false, isToday: true } : dueMeta(t.dueDate)
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onToggle(t.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left text-sm hover:bg-secondary"
                  >
                    <span
                      className={cn(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors',
                        done ? 'border-success bg-success text-white' : 'border-border',
                      )}
                    >
                      {done && <span className="text-[9px] leading-none">✓</span>}
                    </span>
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[t.priority])} />
                    <span className={cn('flex-1 truncate', done && 'text-muted-foreground line-through')}>{t.title}</span>
                    {due && (
                      <span
                        className={cn(
                          'shrink-0 text-xs',
                          done ? 'text-muted-foreground' : due.overdue ? 'text-destructive' : due.isToday ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {due.label}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
            </ul>
          )}
        </div>

        <QuickTaskAdd />
      </CardContent>
    </Card>
  )
}

function QuickTaskAdd() {
  const add = useTasks((st) => st.add)
  const { toast } = useToast()
  const [title, setTitle] = useState('')

  const addTask = (text: string) => {
    const t = text.trim()
    if (!t) return
    add({ title: t.charAt(0).toUpperCase() + t.slice(1), priority: 'medium', dueDate: dayKey() })
    toast({ kind: 'success', title: 'Task added for today' })
  }
  const submit = () => { addTask(title); setTitle('') }

  // Voice: tap mic, speak, the spoken text is added to today's tasks as-is.
  const { supported, listening, start, stop } = useSpeechRecognition({
    onResult: (transcript) => addTask(transcript),
  })

  return (
    <div className="mt-3 flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={listening ? 'Listening… say your task' : 'Add a task for today…'}
        className="h-9"
      />
      {supported && (
        <Button
          size="sm"
          variant={listening ? 'destructive' : 'outline'}
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => (listening ? stop() : start())}
          aria-label={listening ? 'Stop listening' : 'Add task by voice'}
          title="Add task by voice"
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
      <Button size="sm" className="h-9" onClick={submit} disabled={!title.trim()}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  )
}

function AppointmentsSection({ today, upcoming }: { today: Appointment[]; upcoming: Appointment[] }) {
  const [tab, setTab] = useState<'today' | 'upcoming'>('today')
  const items = tab === 'today' ? today : upcoming

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col p-5">
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex">
            {([
              { value: 'today', label: 'Today', count: today.length },
              { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
            ] as const).map((t) => {
              const active = tab === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    '-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2.5 pr-4 text-sm font-medium transition-colors',
                    active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground')}>
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>
          <Link to="/appointments" className="flex items-center gap-0.5 pb-2.5 text-xs font-medium text-primary hover:underline">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-3 max-h-[200px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tab === 'today' ? 'No appointments today. Clear schedule!' : 'Nothing upcoming.'}
            </p>
          ) : (
            <ul className="space-y-1">
            {items.map((a) => {
              const d = new Date(a.start)
              return (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-secondary">
                  <div className="flex min-w-0 items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{a.title}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {tab === 'today'
                      ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                      : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </li>
              )
            })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const GLASS_ML = 200

function QuickWaterAdd() {
  const add = useWater((st) => st.add)
  const goal = useSettings((st) => st.waterGoalMl)
  const { toast } = useToast()
  const today = useWater((st) => st.entries).filter((e) => e.day === dayKey()).reduce((a, e) => a + e.amountMl, 0)
  const log = (ml: number) => {
    add(ml)
    if (today < goal && today + ml >= goal) toast({ kind: 'success', title: '🎉 Hydration goal reached!' })
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {[1, 2].map((glasses) => {
        const ml = glasses * GLASS_ML
        return (
          <button
            key={glasses}
            onClick={() => log(ml)}
            className="group flex flex-col items-center gap-1.5 rounded-xl border border-border py-3 transition-all hover:-translate-y-0.5 hover:border-[hsl(199_89%_55%)] hover:shadow-soft active:scale-95"
            aria-label={`Add ${glasses} glass — ${ml} ml`}
          >
            <span className="flex items-end gap-0.5">
              {Array.from({ length: glasses }).map((_, i) => (
                <GlassWater key={i} className="h-5 w-5 text-[hsl(199_89%_55%)] transition-transform group-hover:scale-110" />
              ))}
            </span>
            <span className="text-xs font-semibold leading-none">
              {glasses} glass{glasses > 1 ? 'es' : ''}
            </span>
            <span className="text-[10px] leading-none text-muted-foreground">{ml} ml</span>
          </button>
        )
      })}
    </div>
  )
}

const CLOCKS = [
  { city: 'India', flag: '🇮🇳', tz: 'Asia/Kolkata' },
  { city: 'US', flag: '🇺🇸', tz: 'America/Los_Angeles' },
  { city: 'Poland', flag: '🇵🇱', tz: 'Europe/Warsaw' },
]

function WorldClocks({ now }: { now: Date }) {
  return (
    <div className="hidden flex-wrap items-center gap-2 sm:flex">
      {CLOCKS.map((c) => {
        const time = now.toLocaleTimeString('en-US', { timeZone: c.tz, hour: 'numeric', minute: '2-digit', hour12: true })
        const date = now.toLocaleDateString('en-US', { timeZone: c.tz, weekday: 'short', day: 'numeric' })
        return (
          <div key={c.city} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-soft">
            <span className="text-lg leading-none">{c.flag}</span>
            <div className="leading-tight">
              <p className="text-sm font-bold tabular-nums">{time}</p>
              <p className="text-[10px] text-muted-foreground">{c.city} · {date}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
