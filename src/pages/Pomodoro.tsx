import { useEffect } from 'react'
import { Brain, Coffee, Sofa } from 'lucide-react'
import { Card, CardContent, PageHeader } from '@/components/ui/primitives'
import { PomodoroPanel } from '@/components/PomodoroPanel'
import { useTimer } from '@/store/timer'
import { usePomodoro } from '@/store/pomodoro'
import { useSettings } from '@/store/settings'
import type { SessionKind } from '@/lib/types'
import { dayKey } from '@/lib/utils'

const KIND_ICON: Record<SessionKind, typeof Brain> = { focus: Brain, short: Coffee, long: Sofa }

export default function Pomodoro() {
  const { sessions, completedFocusCount } = usePomodoro()
  const { sessionsBeforeLongBreak } = useSettings()
  const syncDurations = useTimer((s) => s.syncDurations)

  // pick up duration changes made in Settings (only applies while idle)
  useEffect(() => {
    syncDurations()
  }, [syncDurations])

  const today = dayKey()
  const focusToday = sessions.filter((s) => s.day === today && s.kind === 'focus')
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
            {sessionsBeforeLongBreak - (completedFocusCount % sessionsBeforeLongBreak)} focus session(s) until a long break
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Sessions today" value={`${focusToday.length}`} />
        <Stat label="Focus today" value={`${Math.round(focusToday.reduce((a, s) => a + s.durationSec, 0) / 60)} min`} />
        <Stat label="This week" value={`${Math.floor(weekMin / 60)}h ${weekMin % 60}m`} />
      </div>

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
