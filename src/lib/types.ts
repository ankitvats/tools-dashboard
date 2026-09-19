// ───────────────────────────────────────────────────────────
// Domain model. Kept flat & serializable for easy backend port.
// ───────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** Retained for backwards-compatible task records created before schedules. */
export type Repeat = 'none' | RecurrenceFrequency

export type MonthDay = number | 'last'

/** A local-date recurrence rule. The date the rule produces is the occurrence due date. */
export interface TaskSchedule {
  frequency: RecurrenceFrequency
  /** Repeat every N frequency units. Defaults to one. */
  interval?: number
  /** Sunday=0 through Saturday=6. Only used by weekly schedules. */
  weekdays?: number[]
  /** Day of a month, or its final day. Used by monthly/yearly schedules. */
  monthDay?: MonthDay
  /** January=1 through December=12. Used by yearly schedules. */
  month?: number
  /** First due date / recurrence anchor in local YYYY-MM-DD form. */
  startsOn: string
  /** Last due date, inclusive. */
  endsOn?: string
  /** Number of days before due date that the task becomes actionable. */
  visibilityLeadDays?: number
}

export interface RecurringTaskReminder {
  /** Fire once when the occurrence becomes available, or on its due date. */
  timing: 'available' | 'due'
  /** Local time in HH:mm form. */
  time: string
}

export interface Task {
  id: string
  title: string
  notes?: string
  completed: boolean
  priority: Priority
  category?: string
  /** ISO date string (YYYY-MM-DD) the task is due, optional. */
  dueDate?: string
  /** 'daily' = a recurring task that appears every day and resets each day. */
  repeat?: Repeat
  /** The source of truth for new recurring tasks. `repeat` supports legacy records. */
  schedule?: TaskSchedule
  /** For daily tasks: the dayKey on which it was last marked done. */
  lastCompletedDay?: string
  reminderAt?: string // ISO datetime
  reminderFired?: boolean
  recurringReminder?: RecurringTaskReminder
  order: number
  createdAt: string
  completedAt?: string
}

export type SessionKind = 'focus' | 'short' | 'long'

export interface PomodoroSession {
  id: string
  kind: SessionKind
  /** Seconds actually focused (for focus sessions). */
  durationSec: number
  completedAt: string // ISO datetime
  day: string // dayKey
}

export interface WaterEntry {
  id: string
  amountMl: number
  at: string // ISO datetime
  day: string
}

export interface StretchLog {
  id: string
  stretchId: string
  at: string
  day: string
}

export interface Quote {
  id: string
  text: string
  author: string
  category: string
}

export type ReminderLead = 0 | 15 | 30 | 60

export interface Appointment {
  id: string
  title: string
  description?: string
  location?: string
  meetingLink?: string
  /** ISO datetime of start. */
  start: string
  /** Minutes duration. */
  durationMin: number
  reminderLead: ReminderLead
  reminderFired?: boolean
  createdAt: string
}

export interface Stretch {
  id: string
  name: string
  icon: string
  durationSec: number
  instructions: string
}

/** One record per day a daily task was marked done. Powers per-day history. */
export interface TaskCompletion {
  id: string
  taskId: string
  /** Identifies a recurring cycle, normally the occurrence due date. */
  occurrenceKey?: string
  /** Date the completion/skip was recorded, for history rollups. */
  day: string // dayKey
  status?: 'completed' | 'skipped' | 'reminded'
  completedAt?: string // ISO datetime
  reminderFiredAt?: string
}
