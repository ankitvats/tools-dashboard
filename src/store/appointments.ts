import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Appointment } from '@/lib/types'
import { uid } from '@/lib/utils'
import { dbFetchAppointments, dbUpsertAppointment, dbDeleteAppointment } from '@/lib/db'

interface AppointmentState {
  appointments: Appointment[]
  synced: boolean
  add: (a: Omit<Appointment, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<Appointment>) => void
  remove: (id: string) => void
  syncFromDB: () => Promise<void>
}

export const useAppointments = create<AppointmentState>()(
  persist(
    (set, get) => ({
      appointments: [],
      synced: false,

      syncFromDB: async () => {
        const remote = await dbFetchAppointments()
        set({ appointments: remote, synced: true })
      },

      add: (a) => {
        const appt: Appointment = { ...a, id: uid('appt'), createdAt: new Date().toISOString() }
        set((s) => ({ appointments: [...s.appointments, appt] }))
        dbUpsertAppointment(appt)
      },

      update: (id, patch) => {
        set((s) => ({ appointments: s.appointments.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
        const updated = get().appointments.find((x) => x.id === id)
        if (updated) dbUpsertAppointment(updated)
      },

      remove: (id) => {
        set((s) => ({ appointments: s.appointments.filter((x) => x.id !== id) }))
        dbDeleteAppointment(id)
      },
    }),
    { name: 'td-appointments' },
  ),
)
