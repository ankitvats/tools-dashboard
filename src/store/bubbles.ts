import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dayKey } from '@/lib/utils'

interface BubbleState {
  total: number
  today: number
  day: string
  bestCombo: number
  pop: () => void
  reportCombo: (c: number) => void
}

export const useBubbles = create<BubbleState>()(
  persist(
    (set) => ({
      total: 0,
      today: 0,
      day: dayKey(),
      bestCombo: 0,
      pop: () =>
        set((s) => {
          const d = dayKey()
          const sameDay = s.day === d
          return { total: s.total + 1, today: (sameDay ? s.today : 0) + 1, day: d }
        }),
      reportCombo: (c) => set((s) => (c > s.bestCombo ? { bestCombo: c } : {})),
    }),
    { name: 'td-bubbles' },
  ),
)
