import type { Task, TaskCompletion, TaskSchedule } from './types'
import { dayKey } from './utils'

export interface TaskOccurrence {
  task: Task
  occurrenceKey: string
  dueDate: string
  availableFrom: string
  completion?: TaskCompletion
  status: 'active' | 'completed' | 'skipped' | 'missed'
}

const DAY_MS = 86_400_000
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localDate(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

function addDays(key: string, amount: number): string {
  const date = localDate(key)
  date.setDate(date.getDate() + amount)
  return dayKey(date)
}

function daysBetween(from: string, to: string): number {
  return Math.round((localDate(to).getTime() - localDate(from).getTime()) / DAY_MS)
}

function monthsBetween(from: string, to: string): number {
  const a = localDate(from)
  const b = localDate(to)
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()
}

function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/** Converts legacy daily records into the schedule form used by all new logic. */
export function getTaskSchedule(task: Task): TaskSchedule | undefined {
  if (task.schedule) return task.schedule
  if (task.repeat === 'daily') {
    return { frequency: 'daily', startsOn: task.createdAt.slice(0, 10), interval: 1 }
  }
  return undefined
}

function matchesSchedule(schedule: TaskSchedule, candidate: string): boolean {
  if (candidate < schedule.startsOn || (schedule.endsOn && candidate > schedule.endsOn)) return false
  const interval = Math.max(1, schedule.interval ?? 1)
  const date = localDate(candidate)
  const start = localDate(schedule.startsOn)

  if (schedule.frequency === 'daily') return daysBetween(schedule.startsOn, candidate) % interval === 0
  if (schedule.frequency === 'weekly') {
    const weekdays = schedule.weekdays?.length ? schedule.weekdays : [start.getDay()]
    if (!weekdays.includes(date.getDay())) return false
    const weekOffset = Math.floor((daysBetween(schedule.startsOn, candidate) + start.getDay()) / 7)
    return weekOffset >= 0 && weekOffset % interval === 0
  }
  if (schedule.frequency === 'monthly') {
    const monthOffset = monthsBetween(schedule.startsOn, candidate)
    const targetDay = schedule.monthDay ?? start.getDate()
    return monthOffset >= 0 && monthOffset % interval === 0 &&
      (targetDay === 'last' ? date.getDate() === lastDayOfMonth(date) : date.getDate() === targetDay)
  }
  const targetMonth = schedule.month ?? start.getMonth() + 1
  const targetDay = schedule.monthDay ?? start.getDate()
  return date.getMonth() + 1 === targetMonth &&
    (targetDay === 'last' ? date.getDate() === lastDayOfMonth(date) : date.getDate() === targetDay) &&
    (date.getFullYear() - start.getFullYear()) % interval === 0
}

/** Generates due-date occurrences that overlap an inclusive display range. */
export function getOccurrencesInRange(task: Task, from: string, to: string, completions: TaskCompletion[] = []): TaskOccurrence[] {
  const schedule = getTaskSchedule(task)
  if (!schedule) {
    if (!task.dueDate || task.dueDate < from || task.dueDate > to) return []
    return [{ task, occurrenceKey: task.dueDate, dueDate: task.dueDate, availableFrom: task.dueDate, status: task.completed ? 'completed' : 'active' }]
  }

  const lead = Math.max(0, schedule.visibilityLeadDays ?? 0)
  const firstDue = from < schedule.startsOn ? schedule.startsOn : addDays(from, -lead)
  const records = new Map(completions.filter((c) => c.taskId === task.id).map((c) => [c.occurrenceKey ?? c.day, c]))
  const occurrences: TaskOccurrence[] = []
  let current = localDate(firstDue)
  // Include due dates whose early-visibility window begins inside the range.
  const end = localDate(addDays(to, lead))
  let attempts = 0
  while (current <= end && attempts++ < 3_700) {
    const dueDate = dayKey(current)
    if (matchesSchedule(schedule, dueDate)) {
      const availableFrom = addDays(dueDate, -lead)
      if (availableFrom <= to && dueDate >= from) {
        const completion = records.get(dueDate)
        occurrences.push({
          task,
          occurrenceKey: dueDate,
          dueDate,
          availableFrom,
          completion,
          status: completion?.status === 'skipped' ? 'skipped' : completion?.status === 'completed' ? 'completed' : dueDate < dayKey() ? 'missed' : 'active',
        })
      }
    }
    current.setDate(current.getDate() + 1)
  }
  return occurrences
}

/** Tasks currently actionable: one-offs due today and recurring tasks in their visibility window. */
export function getActiveOccurrences(tasks: Task[], completions: TaskCompletion[], today = dayKey()): TaskOccurrence[] {
  return tasks.flatMap((task) => {
    const schedule = getTaskSchedule(task)
    if (!schedule) return task.dueDate === today ? getOccurrencesInRange(task, today, today, completions) : []
    const lead = Math.max(0, schedule.visibilityLeadDays ?? 0)
    return getOccurrencesInRange(task, addDays(today, -lead), today, completions)
      .filter((occurrence) => occurrence.availableFrom <= today && occurrence.dueDate >= today)
  })
}

export function isOccurrenceDone(occurrence: TaskOccurrence): boolean {
  return occurrence.status === 'completed' || occurrence.status === 'skipped'
}

/** Compatibility helper. Prefer occurrence selectors in new UI. */
export function isTaskDone(t: Task, today = dayKey(), completions: TaskCompletion[] = []): boolean {
  const schedule = getTaskSchedule(t)
  if (!schedule) return t.completed
  return getActiveOccurrences([t], completions, today).some(isOccurrenceDone) || t.lastCompletedDay === today
}

/** Compatibility helper. Recurring tasks are included only while their window is active. */
export function isToday(t: Task, today = dayKey(), completions: TaskCompletion[] = []): boolean {
  return getActiveOccurrences([t], completions, today).length > 0
}

export function scheduleSummary(task: Task): string {
  const schedule = getTaskSchedule(task)
  if (!schedule) return task.dueDate ? `Due ${task.dueDate}` : 'No due date'
  const interval = Math.max(1, schedule.interval ?? 1)
  const every = interval === 1 ? '' : `Every ${interval} `
  if (schedule.frequency === 'weekly') {
    const days = (schedule.weekdays?.length ? schedule.weekdays : [localDate(schedule.startsOn).getDay()]).map((day) => WEEKDAY_NAMES[day]).join(', ')
    return `${every}${interval === 1 ? 'Weekly' : 'weeks'} · ${days}`
  }
  if (schedule.frequency === 'monthly') return `${every}${interval === 1 ? 'Monthly' : 'months'} · ${schedule.monthDay === 'last' ? 'last day' : `${schedule.monthDay ?? localDate(schedule.startsOn).getDate()}th`}`
  if (schedule.frequency === 'yearly') return `${every}${interval === 1 ? 'Yearly' : 'years'}`
  return `${every}${interval === 1 ? 'Daily' : 'days'}`
}

export function occurrenceMeta(occurrence: TaskOccurrence, today = dayKey()): string {
  if (occurrence.status === 'completed') return 'Completed'
  if (occurrence.status === 'skipped') return 'Skipped'
  if (occurrence.dueDate === today) return 'Due today'
  const left = daysBetween(today, occurrence.dueDate)
  return `${left} day${left === 1 ? '' : 's'} left · due ${occurrence.dueDate}`
}