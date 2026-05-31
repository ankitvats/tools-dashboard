import { useEffect } from 'react'
import { useSettings } from '@/store/settings'
import { useAppointments } from '@/store/appointments'
import { useTasks } from '@/store/tasks'
import { useWater } from '@/store/water'
import { scheduleBackgroundReminders } from '@/lib/pwa'

/**
 * Keeps OS-scheduled (background) reminders in sync with the user's data.
 * Reschedules whenever reminder settings, appointments, tasks, or water intake change.
 */
export function useBackgroundReminders() {
  const stretchEnabled = useSettings((s) => s.stretchReminderEnabled)
  const stretchMin = useSettings((s) => s.stretchReminderMin)
  const waterEnabled = useSettings((s) => s.waterReminderEnabled)
  const waterMin = useSettings((s) => s.waterReminderMin)
  const notificationsEnabled = useSettings((s) => s.notificationsEnabled)
  const appts = useAppointments((s) => s.appointments)
  const tasks = useTasks((s) => s.tasks)
  const waterCount = useWater((s) => s.entries.length)

  useEffect(() => {
    scheduleBackgroundReminders()
  }, [stretchEnabled, stretchMin, waterEnabled, waterMin, notificationsEnabled, appts, tasks, waterCount])
}
