import { LayoutDashboard, Timer, CheckSquare, Droplets, Activity, Wind, Grip, Quote, BookOpen, Code2, GitCompare, CalendarDays, BarChart3, History } from 'lucide-react'
import type { ComponentType } from 'react'

export type NavSection = 'workspace' | 'focus' | 'toolbox'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** show in mobile bottom bar */
  mobile?: boolean
  section: NavSection
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, mobile: true, section: 'workspace' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, mobile: true, section: 'workspace' },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays, mobile: true, section: 'workspace' },
  { to: '/insights', label: 'Insights', icon: BarChart3, section: 'workspace' },
  { to: '/history', label: 'Daily History', icon: History, section: 'workspace' },
  { to: '/pomodoro', label: 'Pomodoro', icon: Timer, mobile: true, section: 'focus' },
  { to: '/water', label: 'Water', icon: Droplets, mobile: true, section: 'focus' },
  { to: '/stretch', label: 'Stretch', icon: Activity, section: 'toolbox' },
  { to: '/breathing', label: 'Breathing', icon: Wind, section: 'toolbox' },
  { to: '/bubbles', label: 'Bubble Wrap', icon: Grip, section: 'toolbox' },
  { to: '/motivation', label: 'Motivation', icon: Quote, section: 'toolbox' },
  { to: '/vocabulary', label: 'Word of the Day', icon: BookOpen, section: 'toolbox' },
  { to: '/dev-bytes', label: 'Frontend Bytes', icon: Code2, section: 'toolbox' },
  { to: '/diff', label: 'Diff Checker', icon: GitCompare, section: 'toolbox' },
]

export const SECTION_ORDER: NavSection[] = ['workspace', 'focus', 'toolbox']
export const SECTION_LABELS: Record<NavSection, string> = {
  workspace: 'WORKSPACE',
  focus: 'FOCUS',
  toolbox: 'TOOLBOX',
}
