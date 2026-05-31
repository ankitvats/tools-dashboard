import { LayoutDashboard, Timer, CheckSquare, Droplets, Activity, Wind, Grip, Quote, CalendarDays, BarChart3, Settings } from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** show in mobile bottom bar */
  mobile?: boolean
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { to: '/pomodoro', label: 'Pomodoro', icon: Timer, mobile: true },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, mobile: true },
  { to: '/water', label: 'Water', icon: Droplets, mobile: true },
  { to: '/stretch', label: 'Stretch', icon: Activity },
  { to: '/breathing', label: 'Breathing', icon: Wind },
  { to: '/bubbles', label: 'Bubble Wrap', icon: Grip },
  { to: '/motivation', label: 'Motivation', icon: Quote },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays, mobile: true },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]
