import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PomodoroSession, SessionKind } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'

interface PomodoroState {
  sessions: PomodoroSession[]
  completedFocusCount: number // rolling counter for long-break cadence
  log: (kind: SessionKind, durationSec: number) => void
  resetCadence: () => void
}

export const usePomodoro = create<PomodoroState>()(
  persist(
    (set) => ({
      sessions: [],
      completedFocusCount: 0,
      log: (kind, durationSec) =>
        set((s) => ({
          sessions: [
            { id: uid('pomo'), kind, durationSec, completedAt: new Date().toISOString(), day: dayKey() },
            ...s.sessions,
          ],
          completedFocusCount: kind === 'focus' ? s.completedFocusCount + 1 : s.completedFocusCount,
        })),
      resetCadence: () => set({ completedFocusCount: 0 }),
    }),
    { name: 'td-pomodoro' },
  ),
)
