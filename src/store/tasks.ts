import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Priority, Task, TaskCompletion } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'
import {
  dbFetchTasks,
  dbUpsertTask,
  dbUpsertTasks,
  dbDeleteTask,
  dbFetchTaskCompletions,
  dbInsertTaskCompletion,
  dbDeleteTaskCompletion,
} from '@/lib/db'

interface TaskState {
  tasks: Task[]
  completions: TaskCompletion[]
  synced: boolean
  add: (t: Omit<Task, 'id' | 'completed' | 'order' | 'createdAt'>) => void
  update: (id: string, patch: Partial<Task>) => void
  remove: (id: string) => void
  /** Toggles one occurrence for a recurring task; one-offs omit occurrenceKey. */
  toggle: (id: string, occurrenceKey?: string) => void
  skipOccurrence: (id: string, occurrenceKey: string) => void
  markRecurringReminderFired: (id: string, occurrenceKey: string) => void
  reorder: (ids: string[]) => void
  syncFromDB: () => Promise<void>
}

export const useTasks = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      completions: [],
      synced: false,

      syncFromDB: async () => {
        const remote = await dbFetchTasks()
        const remoteCompletions = await dbFetchTaskCompletions()
        const local = get().tasks
        const localCompletions = get().completions
        if (remote.length > 0) {
          // A task just created while offline (or during a transient failed
          // upsert) must not disappear when the remote snapshot arrives.
          const remoteIds = new Set(remote.map((task) => task.id))
          const unsyncedLocal = local.filter((task) => !remoteIds.has(task.id))
          const remoteCompletionIds = new Set(remoteCompletions.map((completion) => completion.id))
          const unsyncedCompletions = localCompletions.filter((completion) => !remoteCompletionIds.has(completion.id))
          if (unsyncedLocal.length > 0) await dbUpsertTasks(unsyncedLocal)
          set({ tasks: [...unsyncedLocal, ...remote], completions: [...unsyncedCompletions, ...remoteCompletions], synced: true })
        } else {
          // push local tasks to DB on first sync
          if (local.length > 0) await dbUpsertTasks(local)
          // Preserve local completion history even if the remote table is empty.
          set({ completions: localCompletions, synced: true })
        }
      },

      add: (t) => {
        const task: Task = {
          id: uid('task'),
          completed: false,
          order: get().tasks.length,
          createdAt: new Date().toISOString(),
          ...t,
          priority: t.priority ?? ('medium' as Priority),
        }
        set((s) => ({ tasks: [task, ...s.tasks] }))
        dbUpsertTask(task)
      },

      update: (id, patch) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
        const updated = get().tasks.find((t) => t.id === id)
        if (updated) dbUpsertTask(updated)
      },

      remove: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
        dbDeleteTask(id)
      },

      toggle: (id, occurrenceKey) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return

        if (task.schedule || task.repeat === 'daily') {
          const today = dayKey()
          const key = occurrenceKey ?? today
          const existing = get().completions.find((c) => c.taskId === id && (c.occurrenceKey ?? c.day) === key)
          const resolved = existing?.status !== 'reminded'

          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    // Preserve the daily compatibility field for old consumers and sync readers.
                    lastCompletedDay: key === today && resolved ? undefined : key === today ? today : t.lastCompletedDay,
                    completedAt: resolved ? undefined : new Date().toISOString(),
                  }
                : t,
            ),
            completions: existing && resolved
              ? s.completions.filter((c) => !(c.taskId === id && (c.occurrenceKey ?? c.day) === key))
              : existing
                ? s.completions.map((c) => c.id === existing.id ? { ...c, day: today, status: 'completed', completedAt: new Date().toISOString() } : c)
                : [...s.completions, { id: uid('completion'), taskId: id, occurrenceKey: key, day: today, status: 'completed', completedAt: new Date().toISOString() }],
          }))

          const updated = get().tasks.find((t) => t.id === id)
          if (updated) dbUpsertTask(updated)
          if (existing && resolved) {
            dbDeleteTaskCompletion(id, key)
          } else {
            const completion = get().completions.find((c) => c.taskId === id && (c.occurrenceKey ?? c.day) === key)
            if (completion) dbInsertTaskCompletion(completion)
          }
          return
        }

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
              : t,
          ),
        }))
        const updated = get().tasks.find((t) => t.id === id)
        if (updated) dbUpsertTask(updated)
      },

      skipOccurrence: (id, occurrenceKey) => {
        const existing = get().completions.find((c) => c.taskId === id && (c.occurrenceKey ?? c.day) === occurrenceKey)
        if (existing && existing.status !== 'reminded') return
        const completion: TaskCompletion = {
          id: uid('completion'), taskId: id, occurrenceKey, day: dayKey(), status: 'skipped',
        }
        if (existing) {
          const updated = { ...existing, day: dayKey(), status: 'skipped' as const }
          set((s) => ({ completions: s.completions.map((record) => record.id === existing.id ? updated : record) }))
          dbInsertTaskCompletion(updated)
        } else {
          set((s) => ({ completions: [...s.completions, completion] }))
          dbInsertTaskCompletion(completion)
        }
      },

      markRecurringReminderFired: (id, occurrenceKey) => {
        const existing = get().completions.find((c) => c.taskId === id && (c.occurrenceKey ?? c.day) === occurrenceKey)
        const reminderFiredAt = new Date().toISOString()
        const record: TaskCompletion = existing ?? {
          id: uid('completion'), taskId: id, occurrenceKey, day: dayKey(), status: 'reminded',
        }
        set((s) => ({
          completions: existing
            ? s.completions.map((c) => c.id === existing.id ? { ...c, reminderFiredAt } : c)
            : [...s.completions, { ...record, reminderFiredAt }],
        }))
        const updated = get().completions.find((c) => c.taskId === id && (c.occurrenceKey ?? c.day) === occurrenceKey)
        if (updated) dbInsertTaskCompletion(updated)
      },

      reorder: (ids) => {
        const map = new Map(get().tasks.map((t) => [t.id, t]))
        const reordered = ids.map((id, i) => ({ ...(map.get(id) as Task), order: i }))
        set({ tasks: reordered })
        dbUpsertTasks(reordered)
      },
    }),
    // Legacy daily records are interpreted by getTaskSchedule, so retaining the
    // existing storage version avoids dropping a user's persisted task list.
    { name: 'td-tasks' },
  ),
)
