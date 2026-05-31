import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dayKey, uid } from '@/lib/utils'

export interface BreathingLog {
  id: string
  technique: string
  rounds: number
  seconds: number
  at: string
  day: string
}

interface BreathingState {
  logs: BreathingLog[]
  log: (entry: { technique: string; rounds: number; seconds: number }) => void
}

export const useBreathing = create<BreathingState>()(
  persist(
    (set) => ({
      logs: [],
      log: ({ technique, rounds, seconds }) =>
        set((s) => ({
          logs: [{ id: uid('breath'), technique, rounds, seconds, at: new Date().toISOString(), day: dayKey() }, ...s.logs],
        })),
    }),
    { name: 'td-breathing' },
  ),
)
