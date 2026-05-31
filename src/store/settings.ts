import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  userName: string
  // pomodoro
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  sessionsBeforeLongBreak: number
  autoStartNext: boolean
  soundEnabled: boolean
  // water
  waterGoalMl: number
  waterReminderMin: number
  waterReminderEnabled: boolean
  // stretch
  stretchReminderMin: number
  stretchReminderEnabled: boolean
  // notifications
  notificationsEnabled: boolean

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
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
      set: (key, value) => set({ [key]: value } as any),
    }),
    { name: 'td-theme' }, // shared key also read by index.html anti-flash script
  ),
)
