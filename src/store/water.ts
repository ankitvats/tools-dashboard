import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WaterEntry } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'
import { dbFetchWater, dbInsertWater, dbDeleteWater } from '@/lib/db'

interface WaterState {
  entries: WaterEntry[]
  synced: boolean
  add: (amountMl: number) => void
  undoLast: () => void
  remove: (id: string) => void
  syncFromDB: () => Promise<void>
}

export const useWater = create<WaterState>()(
  persist(
    (set, get) => ({
      entries: [],
      synced: false,

      syncFromDB: async () => {
        const remote = await dbFetchWater()
        set({ entries: remote, synced: true })
      },

      add: (amountMl) => {
        const entry: WaterEntry = { id: uid('water'), amountMl, at: new Date().toISOString(), day: dayKey() }
        set((s) => ({ entries: [entry, ...s.entries] }))
        dbInsertWater(entry)
      },

      undoLast: () => {
        const last = get().entries[0]
        set((s) => ({ entries: s.entries.slice(1) }))
        if (last) dbDeleteWater(last.id)
      },

      remove: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
        dbDeleteWater(id)
      },
    }),
    { name: 'td-water' },
  ),
)
