// ───────────────────────────────────────────────────────────
// Domain model. Kept flat & serializable for easy backend port.
// ───────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high'

export type Repeat = 'none' | 'daily'

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
  /** For daily tasks: the dayKey on which it was last marked done. */
  lastCompletedDay?: string
  reminderAt?: string // ISO datetime
  reminderFired?: boolean
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
  day: string // dayKey
  completedAt: string // ISO datetime
}
