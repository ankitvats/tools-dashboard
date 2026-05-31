import type { Task } from './types'
import { dayKey } from './utils'

/** Whether a task counts as done *for the given day*. Daily tasks reset each day. */
export function isTaskDone(t: Task, today = dayKey()): boolean {
  return t.repeat === 'daily' ? t.lastCompletedDay === today : t.completed
}

/** Tasks that belong on "today": dated-today one-offs plus every daily task. */
export function isToday(t: Task, today = dayKey()): boolean {
  return t.repeat === 'daily' || t.dueDate === today
}
