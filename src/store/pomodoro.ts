import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PomodoroSession, SessionKind } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'
import { dbFetchSessions, dbInsertSession } from '@/lib/db'

interface PomodoroState {
  sessions: PomodoroSession[]
  completedFocusCount: number
  synced: boolean
  log: (kind: SessionKind, durationSec: number) => void
  resetCadence: () => void
  syncFromDB: () => Promise<void>
}

export const usePomodoro = create<PomodoroState>()(
  persist(
    (set) => ({
      sessions: [],
      completedFocusCount: 0,
      synced: false,

      syncFromDB: async () => {
        const remote = await dbFetchSessions()
        if (remote.length > 0) {
          set({ sessions: remote, synced: true })
        } else {
          set({ synced: true })
        }
      },

      log: (kind, durationSec) => {
        const session: PomodoroSession = {
          id: uid('pomo'),
          kind,
          durationSec,
          completedAt: new Date().toISOString(),
          day: dayKey(),
        }
        set((s) => ({
          sessions: [session, ...s.sessions],
          completedFocusCount: kind === 'focus' ? s.completedFocusCount + 1 : s.completedFocusCount,
        }))
        dbInsertSession(session)
      },

      resetCadence: () => set({ completedFocusCount: 0 }),
    }),
    { name: 'td-pomodoro' },
  ),
)
