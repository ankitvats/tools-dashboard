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
  toggle: (id: string) => void
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
        if (remote.length > 0) {
          set({ tasks: remote, completions: remoteCompletions, synced: true })
        } else {
          // push local tasks to DB on first sync
          const local = get().tasks
          if (local.length > 0) await dbUpsertTasks(local)
          set({ completions: remoteCompletions, synced: true })
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

      toggle: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return

        if (task.repeat === 'daily') {
          const today = dayKey()
          const doneToday = task.lastCompletedDay === today

          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    lastCompletedDay: doneToday ? undefined : today,
                    completedAt: doneToday ? undefined : new Date().toISOString(),
                  }
                : t,
            ),
            completions: doneToday
              ? s.completions.filter((c) => !(c.taskId === id && c.day === today))
              : [...s.completions, { id: uid('completion'), taskId: id, day: today, completedAt: new Date().toISOString() }],
          }))

          const updated = get().tasks.find((t) => t.id === id)
          if (updated) dbUpsertTask(updated)
          if (doneToday) {
            dbDeleteTaskCompletion(id, today)
          } else {
            const completion = get().completions.find((c) => c.taskId === id && c.day === today)
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

      reorder: (ids) => {
        const map = new Map(get().tasks.map((t) => [t.id, t]))
        const reordered = ids.map((id, i) => ({ ...(map.get(id) as Task), order: i }))
        set({ tasks: reordered })
        dbUpsertTasks(reordered)
      },
    }),
    { name: 'td-tasks' },
  ),
)
