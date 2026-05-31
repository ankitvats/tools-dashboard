import { useMemo } from 'react'
import { useTasks } from '@/store/tasks'
import { usePomodoro } from '@/store/pomodoro'
import { useWater } from '@/store/water'
import { useStretch } from '@/store/stretch'
import { useAppointments } from '@/store/appointments'
import { useSettings } from '@/store/settings'
import { isTaskDone, isToday } from '@/lib/tasks'
import { dayKey, lastNDays, pct } from '@/lib/utils'

export interface DayStat {
  day: string
  label: string
  tasks: number
  focusMin: number
  waterMl: number
  stretches: number
}

export function useStats() {
  const tasks = useTasks((s) => s.tasks)
  const sessions = usePomodoro((s) => s.sessions)
  const water = useWater((s) => s.entries)
  const stretch = useStretch((s) => s.logs)
  const appts = useAppointments((s) => s.appointments)
  const { waterGoalMl } = useSettings()

  return useMemo(() => {
    const today = dayKey()

    const tasksToday = tasks.filter((t) => isToday(t, today))
    const tasksDoneToday = tasks.filter((t) =>
      t.repeat === 'daily' ? t.lastCompletedDay === today : t.completed && t.completedAt?.slice(0, 10) === today,
    )
    const focusToday = sessions.filter((s) => s.day === today && s.kind === 'focus')
    const focusMinToday = Math.round(focusToday.reduce((a, s) => a + s.durationSec, 0) / 60)
    const waterToday = water.filter((w) => w.day === today).reduce((a, w) => a + w.amountMl, 0)
    const stretchesToday = stretch.filter((s) => s.day === today).length

    // Productivity score (0-100): blend of 4 signals.
    const taskScore = tasksToday.length ? pct(tasksToday.filter((t) => isTaskDone(t, today)).length, tasksToday.length) : tasksDoneToday.length > 0 ? 100 : 0
    const waterScore = pct(waterToday, waterGoalMl)
    const focusScore = pct(focusToday.length, 8) // 8 sessions = full
    const stretchScore = pct(stretchesToday, 5)
    const score = Math.round(taskScore * 0.3 + waterScore * 0.25 + focusScore * 0.3 + stretchScore * 0.15)

    const series7: DayStat[] = lastNDays(7).map((d) => {
      const dt = new Date(d + 'T00:00:00')
      return {
        day: d,
        label: dt.toLocaleDateString(undefined, { weekday: 'short' }),
        tasks: tasks.filter((t) => t.completed && t.completedAt?.slice(0, 10) === d).length,
        focusMin: Math.round(sessions.filter((s) => s.day === d && s.kind === 'focus').reduce((a, s) => a + s.durationSec, 0) / 60),
        waterMl: water.filter((w) => w.day === d).reduce((a, w) => a + w.amountMl, 0),
        stretches: stretch.filter((s) => s.day === d).length,
      }
    })

    const weeklyFocusMin = series7.reduce((a, d) => a + d.focusMin, 0)

    const apptsToday = appts.filter((a) => a.start.slice(0, 10) === today).sort((a, b) => a.start.localeCompare(b.start))
    const upcoming = appts
      .filter((a) => new Date(a.start).getTime() >= Date.now())
      .sort((a, b) => a.start.localeCompare(b.start))

    return {
      today,
      score,
      breakdown: { taskScore, waterScore, focusScore, stretchScore },
      tasksToday,
      tasksDoneToday: tasksDoneToday.length,
      focusSessionsToday: focusToday.length,
      focusMinToday,
      waterToday,
      waterGoalMl,
      stretchesToday,
      series7,
      weeklyFocusMin,
      apptsToday,
      upcoming,
    }
  }, [tasks, sessions, water, stretch, appts, waterGoalMl])
}
