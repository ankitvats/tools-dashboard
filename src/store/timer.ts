import { create } from 'zustand'
import type { SessionKind } from '@/lib/types'
import { useSettings } from './settings'

export type TimerStatus = 'idle' | 'running' | 'paused'

function totalForKind(kind: SessionKind): number {
  const s = useSettings.getState()
  const min = kind === 'focus' ? s.focusMin : kind === 'short' ? s.shortBreakMin : s.longBreakMin
  return min * 60
}

interface TimerState {
  kind: SessionKind
  status: TimerStatus
  remaining: number
  total: number

  setKind: (kind: SessionKind) => void
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  /** internal: decrement one second (engine drives this) */
  _tick: () => void
  /** move to a fresh session of `next` kind, idle */
  advance: (next: SessionKind) => void
  /** re-read durations from settings while idle (e.g. settings changed) */
  syncDurations: () => void
}

const initialKind: SessionKind = 'focus'
const initialTotal = totalForKind(initialKind)

export const useTimer = create<TimerState>((set, get) => ({
  kind: initialKind,
  status: 'idle',
  remaining: initialTotal,
  total: initialTotal,

  setKind: (kind) => {
    if (get().status === 'running') return
    const total = totalForKind(kind)
    set({ kind, total, remaining: total, status: 'idle' })
  },
  start: () => {
    const { remaining, total } = get()
    set({ status: 'running', remaining: remaining > 0 ? remaining : total })
  },
  pause: () => set({ status: 'paused' }),
  resume: () => set({ status: 'running' }),
  reset: () => {
    const total = totalForKind(get().kind)
    set({ status: 'idle', total, remaining: total })
  },
  _tick: () => set((s) => ({ remaining: Math.max(0, s.remaining - 1) })),
  advance: (next) => {
    const total = totalForKind(next)
    set({ kind: next, total, remaining: total, status: 'idle' })
  },
  syncDurations: () => {
    if (get().status !== 'idle') return
    const total = totalForKind(get().kind)
    set({ total, remaining: total })
  },
}))
