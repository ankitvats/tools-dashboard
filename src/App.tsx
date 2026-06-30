import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AuthGuard } from '@/components/AuthGuard'
import { ToastProvider } from '@/components/ui/toast'
import { useApplyTheme } from '@/hooks/useTheme'
import { useReminders } from '@/hooks/useReminders'
import { useBackgroundReminders } from '@/hooks/useBackgroundReminders'
import { usePomodoroEngine } from '@/hooks/usePomodoroEngine'
import { useAuth } from '@/store/auth'
import { useTasks } from '@/store/tasks'
import { usePomodoro } from '@/store/pomodoro'
import { useWater } from '@/store/water'
import { useStretch } from '@/store/stretch'
import { useAppointments } from '@/store/appointments'
import { useSettings } from '@/store/settings'
import AuthPage from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import Pomodoro from '@/pages/Pomodoro'
import Tasks from '@/pages/Tasks'
import Water from '@/pages/Water'
import Stretch from '@/pages/Stretch'
import Breathing from '@/pages/Breathing'
import Bubbles from '@/pages/Bubbles'
import Motivation from '@/pages/Motivation'
import Vocabulary from '@/pages/Vocabulary'
import DevBytes from '@/pages/DevBytes'
import DiffChecker from '@/pages/DiffChecker'
import Appointments from '@/pages/Appointments'
import Insights from '@/pages/Insights'
import History from '@/pages/History'
import SettingsPage from '@/pages/Settings'

function AppInner() {
  useApplyTheme()
  useReminders()
  useBackgroundReminders()
  usePomodoroEngine()
  const syncTasks = useTasks((s) => s.syncFromDB)
  const syncPomodoro = usePomodoro((s) => s.syncFromDB)
  const syncWater = useWater((s) => s.syncFromDB)
  const syncStretch = useStretch((s) => s.syncFromDB)
  const syncAppointments = useAppointments((s) => s.syncFromDB)
  const syncSettings = useSettings((s) => s.syncFromDB)
  const user = useAuth((s) => s.user)
  useEffect(() => {
    if (user) {
      syncTasks()
      syncPomodoro()
      syncWater()
      syncStretch()
      syncAppointments()
      syncSettings()
    }
  }, [user])
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pomodoro" element={<Pomodoro />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/water" element={<Water />} />
        <Route path="/stretch" element={<Stretch />} />
        <Route path="/breathing" element={<Breathing />} />
        <Route path="/bubbles" element={<Bubbles />} />
        <Route path="/motivation" element={<Motivation />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/dev-bytes" element={<DevBytes />} />
        <Route path="/diff" element={<DiffChecker />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const init = useAuth((s) => s.init)
  useEffect(() => init(), [init])

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="*"
          element={
            <AuthGuard>
              <AppInner />
            </AuthGuard>
          }
        />
      </Routes>
    </ToastProvider>
  )
}
