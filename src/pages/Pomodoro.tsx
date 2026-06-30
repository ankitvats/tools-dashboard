import { useEffect, useMemo, useState } from 'react'
import { Brain, Coffee, Sofa, CheckSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from '@/components/ui/primitives'
import { Select } from '@/components/ui/select'
import { PomodoroPanel } from '@/components/PomodoroPanel'
import { useTimer } from '@/store/timer'
import { usePomodoro } from '@/store/pomodoro'
import { useSettings } from '@/store/settings'
import { useTasks } from '@/store/tasks'
import type { SessionKind } from '@/lib/types'
import { isTaskDone } from '@/lib/tasks'
import { dayKey, lastNDays } from '@/lib/utils'

const KIND_ICON: Record<SessionKind, typeof Brain> = { focus: Brain, short: Coffee, long: Sofa }

export default function Pomodoro() {
  const { sessions, completedFocusCount } = usePomodoro()
  const { sessionsBeforeLongBreak } = useSettings()
  const syncDurations = useTimer((s) => s.syncDurations)
  const timerKind = useTimer((s) => s.kind)
  const tasks = useTasks((s) => s.tasks)
  const [workingOnId, setWorkingOnId] = useState<string>('')

  // pick up duration changes made in Settings (only applies while idle)
  useEffect(() => {
    syncDurations()
  }, [syncDurations])

  const today = dayKey()
  const activeTasks = tasks.filter((t) => !isTaskDone(t))
  const focusToday = sessions.filter((s) => s.day === today && s.kind === 'focus')
  const chartData = useMemo(() =>
    lastNDays(7).map((d) => ({
      day: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
      minutes: Math.round(sessions.filter((s) => s.kind === 'focus' && s.day === d).reduce((a, s) => a + s.durationSec, 0) / 60),
    })),
  [sessions])
  const weekMin = Math.round(
    sessions
      .filter((s) => s.kind === 'focus' && new Date(s.completedAt).getTime() > Date.now() - 7 * 864e5)
      .reduce((a, s) => a + s.durationSec, 0) / 60,
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Pomodoro" subtitle="Focus in deep-work intervals, rest with intention." />

      <Card>
        <CardContent className="p-8">
          <PomodoroPanel />
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {timerKind === 'long'
              ? 'Long break — enjoy the rest!'
              : `${sessionsBeforeLongBreak - (completedFocusCount % sessionsBeforeLongBreak || sessionsBeforeLongBreak)} focus session(s) until a long break`}
          </p>
          {timerKind === 'focus' && activeTasks.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select
                value={workingOnId}
                onChange={(e) => setWorkingOnId(e.target.value)}
                className="max-w-[280px] text-sm"
                options={[
                  { value: '', label: 'Working on…' },
                  ...activeTasks.map((t) => ({ value: t.id, label: t.title })),
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Sessions today" value={`${focusToday.length}`} />
        <Stat label="Focus today" value={`${Math.round(focusToday.reduce((a, s) => a + s.durationSec, 0) / 60)} min`} />
        <Stat label="This week" value={`${Math.floor(weekMin / 60)}h ${weekMin % 60}m`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Focus minutes — last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-glow">
                      <p className="mb-1 font-medium">{label}</p>
                      <p className="text-primary tabular-nums">{payload[0].value} min</p>
                    </div>
                  ) : null
                }
                cursor={{ fill: 'hsl(var(--secondary))' }}
              />
              <Bar dataKey="minutes" fill="hsl(256 90% 67%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold">Session history</h3>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sessions yet. Start your first focus block above.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {sessions.slice(0, 12).map((s) => {
                const Icon = KIND_ICON[s.kind]
                return (
                  <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{s.kind}</span>
                      <span className="text-muted-foreground">· {Math.round(s.durationSec / 60)} min</span>
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(s.completedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
