import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Priority, Task } from '@/lib/types'
import { dayKey, uid } from '@/lib/utils'

interface TaskState {
  tasks: Task[]
  add: (t: Omit<Task, 'id' | 'completed' | 'order' | 'createdAt'>) => void
  update: (id: string, patch: Partial<Task>) => void
  remove: (id: string) => void
  toggle: (id: string) => void
  reorder: (ids: string[]) => void
}

export const useTasks = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      add: (t) =>
        set((s) => ({
          tasks: [
            {
              id: uid('task'),
              completed: false,
              order: s.tasks.length,
              createdAt: new Date().toISOString(),
              ...t,
              priority: t.priority ?? ('medium' as Priority),
            },
            ...s.tasks,
          ],
        })),
      update: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      toggle: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t
            // Daily task: toggle today's completion without touching the row's identity.
            if (t.repeat === 'daily') {
              const today = dayKey()
              const doneToday = t.lastCompletedDay === today
              return {
                ...t,
                lastCompletedDay: doneToday ? undefined : today,
                completedAt: doneToday ? undefined : new Date().toISOString(),
              }
            }
            return { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
          }),
        })),
      reorder: (ids) => {
        const map = new Map(get().tasks.map((t) => [t.id, t]))
        set({ tasks: ids.map((id, i) => ({ ...(map.get(id) as Task), order: i })) })
      },
    }),
    { name: 'td-tasks' },
  ),
)
