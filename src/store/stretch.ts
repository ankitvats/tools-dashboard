import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StretchLog } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'

interface StretchState {
  logs: StretchLog[]
  log: (stretchId: string) => void
}

export const useStretch = create<StretchState>()(
  persist(
    (set) => ({
      logs: [],
      log: (stretchId) =>
        set((s) => ({
          logs: [{ id: uid('stretch'), stretchId, at: new Date().toISOString(), day: dayKey() }, ...s.logs],
        })),
    }),
    { name: 'td-stretch' },
  ),
)
