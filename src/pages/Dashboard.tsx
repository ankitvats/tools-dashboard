import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Timer, ArrowRight, CalendarClock, Quote as QuoteIcon, Plus, GlassWater, RefreshCw } from 'lucide-react'
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
              </div>
              <Link to="/pomodoro" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
                Full view <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <PomodoroPanel compact />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <TasksSection onToggle={toggleTask} />
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
    </div>
  )
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

function TasksSection({ onToggle }: { onToggle: (id: string) => void }) {
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
          <Link to="/tasks" className="flex items-center gap-0.5 pb-2.5 text-xs font-medium text-primary hover:underline">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

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
  const submit = () => {
    if (!title.trim()) return
    add({ title: title.trim(), priority: 'medium', dueDate: dayKey() })
    toast({ kind: 'success', title: 'Task added for today' })
    setTitle('')
  }
  return (
    <div className="mt-3 flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Add a task for today…"
        className="h-9"
      />
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
    <div className="flex flex-wrap items-center gap-2">
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
