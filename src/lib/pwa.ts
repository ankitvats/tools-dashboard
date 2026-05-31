import { useSettings } from '@/store/settings'
import { useWater } from '@/store/water'
import { useTasks } from '@/store/tasks'
import { useAppointments } from '@/store/appointments'

const TAG_PREFIX = 'td-'
const HORIZON_MS = 8 * 60 * 60 * 1000 // schedule the next 8 hours of interval reminders
const MAX_OCCURRENCES = 24

/** Notification Triggers let us schedule OS-level notifications that fire even when the tab/app is closed. */
export function supportsNotificationTriggers(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'showTrigger' in (window as any).Notification.prototype
}

let triggersActive = false
/** True once we've successfully scheduled background notifications (so the in-tab engine can stand down). */
export function backgroundRemindersActive(): boolean {
  return triggersActive
}

async function clearScheduled(reg: ServiceWorkerRegistration) {
  try {
    const existing = await reg.getNotifications({ includeTriggered: true } as GetNotificationOptions)
    existing.filter((n) => n.tag?.startsWith(TAG_PREFIX)).forEach((n) => n.close())
  } catch {
    /* getNotifications with includeTriggered may throw on partial impls */
  }
}

function show(reg: ServiceWorkerRegistration, tag: string, at: number, title: string, body: string, path: string) {
  if (at <= Date.now() + 1000) return
  reg.showNotification(title, {
    tag: TAG_PREFIX + tag,
    body,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    data: { path },
    showTrigger: new TimestampTrigger(at),
  })
}

/**
 * (Re)schedule all background reminders. Cancels previously-scheduled ones first.
 * Returns true if scheduling via triggers happened.
 */
export async function scheduleBackgroundReminders(): Promise<boolean> {
  if (!supportsNotificationTriggers()) return false
  if (!('serviceWorker' in navigator)) return false
  if (Notification.permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  await clearScheduled(reg)

  const s = useSettings.getState()
  const now = Date.now()

  // Interval reminders: stretch + water
  const series = (enabled: boolean, intervalMin: number, prefix: string, title: string, body: string, path: string) => {
    if (!enabled || intervalMin <= 0) return
    const intervalMs = intervalMin * 60_000
    const count = Math.min(Math.floor(HORIZON_MS / intervalMs), MAX_OCCURRENCES)
    for (let i = 0; i < count; i++) show(reg, `${prefix}-${i}`, now + intervalMs * (i + 1), title, body, path)
  }
  series(s.stretchReminderEnabled, s.stretchReminderMin, 'stretch', '🧘 Time to wake up & stretch', 'Stand up, move around, and loosen up for a minute.', '/stretch')
  series(s.waterReminderEnabled, s.waterReminderMin, 'water', '💧 Time to hydrate', 'Take a sip of water to stay on track.', '/water')

  // Appointment reminders at (start - lead)
  for (const a of useAppointments.getState().appointments) {
    const at = new Date(a.start).getTime() - a.reminderLead * 60_000
    show(reg, `appt-${a.id}`, at, '📅 ' + a.title, a.reminderLead ? `Starts in ${a.reminderLead} min` : 'Starting now', '/appointments')
  }

  // Task reminders
  for (const t of useTasks.getState().tasks) {
    if (t.reminderAt && !t.completed) show(reg, `task-${t.id}`, new Date(t.reminderAt).getTime(), '✅ Task reminder', t.title, '/tasks')
  }

  void useWater // water drinking resets the in-tab clock; triggers use a fixed cadence
  triggersActive = true
  return true
}
