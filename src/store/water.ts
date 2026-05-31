import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WaterEntry } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'

interface WaterState {
  entries: WaterEntry[]
  add: (amountMl: number) => void
  undoLast: () => void
}

export const useWater = create<WaterState>()(
  persist(
    (set) => ({
      entries: [],
      add: (amountMl) =>
        set((s) => ({
          entries: [{ id: uid('water'), amountMl, at: new Date().toISOString(), day: dayKey() }, ...s.entries],
        })),
      undoLast: () => set((s) => ({ entries: s.entries.slice(1) })),
    }),
    { name: 'td-water' },
  ),
)
