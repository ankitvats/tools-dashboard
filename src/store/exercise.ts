import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuth } from '@/store/auth'
import { uid, dayKey } from '@/lib/utils'
import { dbApplyExerciseMutation, dbFetchExercises } from '@/lib/exercise-db'
import {
  EMPTY_EXERCISE_DATA, EXERCISES, findExercise, normalizeExerciseName,
  validExerciseDay, validExerciseValues,
  type Exercise, type ExerciseData, type ExerciseEntry, type ExerciseMutation, type ExerciseUnit,
} from '@/lib/exercises'

interface ExerciseState {
  /** Keep cached data and unsaved changes isolated between signed-in accounts. */
  byUser: Record<string, ExerciseData>
  syncing: Record<string, boolean>
  errors: Record<string, string | undefined>
  addCustom: (userId: string, name: string, unit: ExerciseUnit) => Exercise
  log: (userId: string, exercise: Exercise, sets: number, quantity: number, day: string, entryId?: string) => ExerciseEntry
  remove: (userId: string, entryId: string) => void
  syncFromDB: (userId: string) => Promise<void>
}

function assertAccount(userId: string) {
  if (!userId || useAuth.getState().user?.id !== userId) throw new Error('Please sign in again.')
}

export const useExercise = create<ExerciseState>()(
  persist(
    (set, get) => {
      const dataFor = (userId: string) => get().byUser[userId] ?? EMPTY_EXERCISE_DATA
      const change = (userId: string, update: (data: ExerciseData) => ExerciseData) => {
        set((state) => ({ byUser: { ...state.byUser, [userId]: update(dataFor(userId)) } }))
      }
      const enqueue = (userId: string, mutation: ExerciseMutation, update: (data: ExerciseData) => ExerciseData) => {
        assertAccount(userId)
        change(userId, (data) => ({ ...update(data), pending: [...data.pending, mutation] }))
        void get().syncFromDB(userId)
      }

      return {
        byUser: {}, syncing: {}, errors: {},

        addCustom: (userId, rawName, unit) => {
          assertAccount(userId)
          const name = rawName.trim().replace(/\s+/g, ' ')
          if (!normalizeExerciseName(name) || name.length > 80) throw new Error('Enter an exercise name (up to 80 characters).')
          if (!['reps', 'seconds', 'rounds'].includes(unit)) throw new Error('Choose a valid measurement.')
          const existing = findExercise([...EXERCISES, ...dataFor(userId).customExercises], name)
          if (existing) return existing
          const exercise: Exercise = {
            id: uid('exercise'), name, category: 'Custom', unit, defaultSets: 1,
            defaultQuantity: unit === 'seconds' ? 30 : unit === 'rounds' ? 1 : 10,
          }
          enqueue(userId, { id: uid('change'), kind: 'exercise', exercise }, (data) => ({
            ...data, customExercises: [...data.customExercises, exercise],
          }))
          return exercise
        },

        log: (userId, exercise, sets, quantity, day, entryId) => {
          assertAccount(userId)
          if (!validExerciseValues(sets, quantity)) throw new Error('Use 1–100 sets and a positive whole-number value (up to 86,400).')
          if (!validExerciseDay(day) || day > dayKey()) throw new Error('Choose today or a valid past date.')
          const existing = entryId ? dataFor(userId).entries.find((entry) => entry.id === entryId) : undefined
          if (entryId && !existing) throw new Error('This entry no longer exists.')
          const entry: ExerciseEntry = {
            id: entryId ?? uid('exercise-log'), exerciseId: exercise.id, exerciseName: exercise.name,
            unit: exercise.unit, sets, quantity, day, at: existing?.at ?? new Date().toISOString(),
          }
          enqueue(userId, { id: uid('change'), kind: 'entry', entry }, (data) => ({
            ...data, entries: [entry, ...data.entries.filter((item) => item.id !== entry.id)],
          }))
          return entry
        },

        remove: (userId, entryId) => {
          enqueue(userId, { id: uid('change'), kind: 'delete', entryId }, (data) => ({
            ...data, entries: data.entries.filter((entry) => entry.id !== entryId),
          }))
        },

        syncFromDB: async (userId) => {
          if (get().syncing[userId] || useAuth.getState().user?.id !== userId) return
          set((state) => ({ syncing: { ...state.syncing, [userId]: true } }))
          try {
            // Serialize writes (including deletes) and retry them idempotently after failures.
            for (;;) {
              let mutation = dataFor(userId).pending[0]
              while (mutation) {
                assertAccount(userId)
                await dbApplyExerciseMutation(userId, mutation)
                const completedId = mutation.id
                change(userId, (data) => ({ ...data, pending: data.pending.filter((item) => item.id !== completedId) }))
                mutation = dataFor(userId).pending[0]
              }
              assertAccount(userId)
              const remote = await dbFetchExercises(userId)
              assertAccount(userId)
              // A user may have edited while the remote snapshot was being fetched.
              if (dataFor(userId).pending.length) continue
              change(userId, () => ({ ...remote, pending: [] }))
              set((state) => ({ errors: { ...state.errors, [userId]: undefined } }))
              break
            }
          } catch {
            set((state) => ({ errors: {
              ...state.errors,
              [userId]: 'Cloud sync unavailable. Your changes are saved on this device; retry when connected.',
            } }))
          } finally {
            set((state) => ({ syncing: { ...state.syncing, [userId]: false } }))
          }
        },
      }
    },
    { name: 'td-exercise', partialize: (state) => ({ byUser: state.byUser }) },
  ),
)