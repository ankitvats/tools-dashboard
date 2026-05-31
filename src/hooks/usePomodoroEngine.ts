import { useEffect } from 'react'
import { useTimer } from '@/store/timer'
import { usePomodoro } from '@/store/pomodoro'
import { useSettings } from '@/store/settings'
import type { SessionKind } from '@/lib/types'
import { notify, playChime } from '@/lib/notify'
import { formatClock } from '@/lib/utils'

/**
 * Finish the current session: log it, notify, and advance to the next kind.
 * Used by the engine on natural completion and by the manual "skip" control.
 */
export function completeCurrentSession() {
  const t = useTimer.getState()
  const settings = useSettings.getState()
  const pomo = usePomodoro.getState()
  const finishedKind = t.kind

  pomo.log(finishedKind, t.total)
  if (settings.soundEnabled) playChime('success')
  notify(
    finishedKind === 'focus' ? '🎉 Focus session complete!' : '✨ Break over',
    finishedKind === 'focus' ? 'Great work — time for a break.' : 'Ready for another focus round?',
  )

  // decide next kind (long break every N focus sessions)
  let next: SessionKind = 'focus'
  if (finishedKind === 'focus') {
    next = (pomo.completedFocusCount + 1) % settings.sessionsBeforeLongBreak === 0 ? 'long' : 'short'
  }
  useTimer.getState().advance(next)
  if (settings.autoStartNext) useTimer.getState().start()
}

/**
 * Single global driver for the Pomodoro timer. Mounted once at app root so the
 * timer keeps running regardless of which page is open. Ticks every second,
 * and on completion logs the session, notifies, and auto-advances.
 */
export function usePomodoroEngine() {
  useEffect(() => {
    const id = setInterval(() => {
      const t = useTimer.getState()
      if (t.status !== 'running') return

      if (t.remaining > 1) {
        t._tick()
        return
      }
      t._tick() // -> 0
      completeCurrentSession()
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // keep document title in sync with the running timer
  const status = useTimer((s) => s.status)
  const remaining = useTimer((s) => s.remaining)
  const kind = useTimer((s) => s.kind)
  useEffect(() => {
    document.title =
      status === 'running'
        ? `${formatClock(remaining)} · ${kind} — Tools Dashboard`
        : 'Tools Dashboard — Your productivity hub'
    return () => {
      document.title = 'Tools Dashboard — Your productivity hub'
    }
  }, [status, remaining, kind])
}
