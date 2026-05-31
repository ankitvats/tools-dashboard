import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Appointment } from '@/lib/types'
import { uid } from '@/lib/utils'

interface AppointmentState {
  appointments: Appointment[]
  add: (a: Omit<Appointment, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<Appointment>) => void
  remove: (id: string) => void
}

export const useAppointments = create<AppointmentState>()(
  persist(
    (set) => ({
      appointments: [],
      add: (a) =>
        set((s) => ({
          appointments: [...s.appointments, { ...a, id: uid('appt'), createdAt: new Date().toISOString() }],
        })),
      update: (id, patch) =>
        set((s) => ({ appointments: s.appointments.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      remove: (id) => set((s) => ({ appointments: s.appointments.filter((x) => x.id !== id) })),
    }),
    { name: 'td-appointments' },
  ),
)
