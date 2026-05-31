import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ToastProvider } from '@/components/ui/toast'
import { useApplyTheme } from '@/hooks/useTheme'
import { useReminders } from '@/hooks/useReminders'
import { useBackgroundReminders } from '@/hooks/useBackgroundReminders'
import { usePomodoroEngine } from '@/hooks/usePomodoroEngine'
import Dashboard from '@/pages/Dashboard'
import Pomodoro from '@/pages/Pomodoro'
import Tasks from '@/pages/Tasks'
import Water from '@/pages/Water'
import Stretch from '@/pages/Stretch'
import Breathing from '@/pages/Breathing'
import Bubbles from '@/pages/Bubbles'
import Motivation from '@/pages/Motivation'
import Appointments from '@/pages/Appointments'
import Insights from '@/pages/Insights'
import SettingsPage from '@/pages/Settings'

export default function App() {
  useApplyTheme()
  useReminders()
  useBackgroundReminders()
  usePomodoroEngine()
  return (
    <ToastProvider>
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
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Layout>
    </ToastProvider>
  )
}
