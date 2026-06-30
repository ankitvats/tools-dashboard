import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StretchLog } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'
import { dbFetchStretch, dbInsertStretch } from '@/lib/db'

interface StretchState {
  logs: StretchLog[]
  synced: boolean
  log: (stretchId: string) => void
  syncFromDB: () => Promise<void>
}

export const useStretch = create<StretchState>()(
  persist(
    (set) => ({
      logs: [],
      synced: false,

      syncFromDB: async () => {
        const remote = await dbFetchStretch()
        set({ logs: remote, synced: true })
      },

      log: (stretchId) => {
        const entry: StretchLog = { id: uid('stretch'), stretchId, at: new Date().toISOString(), day: dayKey() }
        set((s) => ({ logs: [entry, ...s.logs] }))
        dbInsertStretch(entry)
      },
    }),
    { name: 'td-stretch' },
  ),
)
