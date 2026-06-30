import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dbFetchSettings, dbUpsertSettings } from '@/lib/db'

export type Theme = 'light' | 'dark' | 'system'

export interface SettingsState {
  theme: Theme
  userName: string
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  sessionsBeforeLongBreak: number
  autoStartNext: boolean
  soundEnabled: boolean
  waterGoalMl: number
  waterReminderMin: number
  waterReminderEnabled: boolean
  stretchReminderMin: number
  stretchReminderEnabled: boolean
  notificationsEnabled: boolean
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  syncFromDB: () => Promise<void>
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      userName: '',
      focusMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      sessionsBeforeLongBreak: 4,
      autoStartNext: false,
      soundEnabled: true,
      waterGoalMl: 2000,
      waterReminderMin: 60,
      waterReminderEnabled: true,
      stretchReminderMin: 30,
      stretchReminderEnabled: true,
      notificationsEnabled: false,

      syncFromDB: async () => {
        const remote = await dbFetchSettings()
        if (remote) {
          set(remote)
        } else {
          // first time — push local settings to DB
          const { set: _set, syncFromDB: _sync, ...local } = get()
          dbUpsertSettings(local)
        }
      },

      set: (key, value) => {
        set({ [key]: value } as any)
        const { set: _set, syncFromDB: _sync, ...current } = get()
        dbUpsertSettings({ ...current, [key]: value })
      },
    }),
    { name: 'td-theme' },
  ),
)
