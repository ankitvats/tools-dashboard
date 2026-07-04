import { supabase } from './supabase'
import { useAuth } from '@/store/auth'
import type { Task, PomodoroSession, WaterEntry, StretchLog, Appointment, TaskCompletion } from './types'
import type { SettingsState } from '@/store/settings'

function uid() {
  return useAuth.getState().user?.id
}

// ── Tasks ─────────────────────────────────────────────────

function toRow(t: Task, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    notes: t.notes ?? null,
    completed: t.completed,
    priority: t.priority,
    category: t.category ?? null,
    due_date: t.dueDate ?? null,
    repeat: t.repeat ?? null,
    last_completed_day: t.lastCompletedDay ?? null,
    reminder_at: t.reminderAt ?? null,
    reminder_fired: t.reminderFired ?? null,
    order: t.order,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
  }
}

function fromRow(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    notes: (r.notes as string) ?? undefined,
    completed: r.completed as boolean,
    priority: r.priority as Task['priority'],
    category: (r.category as string) ?? undefined,
    dueDate: (r.due_date as string) ?? undefined,
    repeat: (r.repeat as Task['repeat']) ?? undefined,
    lastCompletedDay: (r.last_completed_day as string) ?? undefined,
    reminderAt: (r.reminder_at as string) ?? undefined,
    reminderFired: (r.reminder_fired as boolean) ?? undefined,
    order: r.order as number,
    createdAt: r.created_at as string,
    completedAt: (r.completed_at as string) ?? undefined,
  }
}

export async function dbFetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('order', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data as Record<string, unknown>[]).map(fromRow)
}

export async function dbUpsertTask(task: Task) {
  const userId = uid()
  if (!userId) return
  await supabase.from('tasks').upsert(toRow(task, userId))
}

export async function dbUpsertTasks(tasks: Task[]) {
  const userId = uid()
  if (!userId) return
  await supabase.from('tasks').upsert(tasks.map((t) => toRow(t, userId)))
}

export async function dbDeleteTask(id: string) {
  await supabase.from('tasks').delete().eq('id', id)
}

// ── Task completions (per-day history for daily tasks) ──────

export async function dbFetchTaskCompletions(): Promise<TaskCompletion[]> {
  const { data, error } = await supabase.from('task_completions').select('*')
  if (error) { console.error(error); return [] }
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    taskId: r.task_id as string,
    day: r.day as string,
    completedAt: r.completed_at as string,
  }))
}

export async function dbInsertTaskCompletion(c: TaskCompletion) {
  const userId = uid()
  if (!userId) return
  await supabase.from('task_completions').upsert({
    id: c.id,
    user_id: userId,
    task_id: c.taskId,
    day: c.day,
    completed_at: c.completedAt,
  })
}

export async function dbDeleteTaskCompletion(taskId: string, day: string) {
  await supabase.from('task_completions').delete().eq('task_id', taskId).eq('day', day)
}

// ── Pomodoro ──────────────────────────────────────────────

export async function dbFetchSessions(): Promise<PomodoroSession[]> {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .order('completed_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    kind: r.kind as PomodoroSession['kind'],
    durationSec: r.duration_sec as number,
    completedAt: r.completed_at as string,
    day: r.day as string,
  }))
}

export async function dbInsertSession(s: PomodoroSession) {
  const userId = uid()
  if (!userId) return
  await supabase.from('pomodoro_sessions').insert({
    id: s.id,
    user_id: userId,
    kind: s.kind,
    duration_sec: s.durationSec,
    completed_at: s.completedAt,
    day: s.day,
  })
}

// ── Water ─────────────────────────────────────────────────

export async function dbFetchWater(): Promise<WaterEntry[]> {
  const { data, error } = await supabase.from('water_entries').select('*').order('at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    amountMl: r.amount_ml as number,
    at: r.at as string,
    day: r.day as string,
  }))
}

export async function dbInsertWater(e: WaterEntry) {
  const userId = uid()
  if (!userId) return
  await supabase.from('water_entries').insert({ id: e.id, user_id: userId, amount_ml: e.amountMl, at: e.at, day: e.day })
}

export async function dbDeleteWater(id: string) {
  await supabase.from('water_entries').delete().eq('id', id)
}

// ── Stretch ───────────────────────────────────────────────

export async function dbFetchStretch(): Promise<StretchLog[]> {
  const { data, error } = await supabase.from('stretch_logs').select('*').order('at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    stretchId: r.stretch_id as string,
    at: r.at as string,
    day: r.day as string,
  }))
}

export async function dbInsertStretch(l: StretchLog) {
  const userId = uid()
  if (!userId) return
  await supabase.from('stretch_logs').insert({ id: l.id, user_id: userId, stretch_id: l.stretchId, at: l.at, day: l.day })
}

// ── Appointments ──────────────────────────────────────────

export async function dbFetchAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase.from('appointments').select('*').order('start', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? undefined,
    location: (r.location as string) ?? undefined,
    meetingLink: (r.meeting_link as string) ?? undefined,
    start: r.start as string,
    durationMin: r.duration_min as number,
    reminderLead: r.reminder_lead as Appointment['reminderLead'],
    reminderFired: (r.reminder_fired as boolean) ?? undefined,
    createdAt: r.created_at as string,
  }))
}

export async function dbUpsertAppointment(a: Appointment) {
  const userId = uid()
  if (!userId) return
  await supabase.from('appointments').upsert({
    id: a.id,
    user_id: userId,
    title: a.title,
    description: a.description ?? null,
    location: a.location ?? null,
    meeting_link: a.meetingLink ?? null,
    start: a.start,
    duration_min: a.durationMin,
    reminder_lead: a.reminderLead,
    reminder_fired: a.reminderFired ?? null,
    created_at: a.createdAt,
  })
}

export async function dbDeleteAppointment(id: string) {
  await supabase.from('appointments').delete().eq('id', id)
}

// ── Settings ──────────────────────────────────────────────

type SettingsRow = Omit<SettingsState, 'set' | 'syncFromDB'>

export async function dbFetchSettings(): Promise<SettingsRow | null> {
  const userId = uid()
  if (!userId) return null
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single()
  if (error || !data) return null
  const r = data as Record<string, unknown>
  return {
    theme: r.theme as SettingsRow['theme'],
    userName: r.user_name as string,
    focusMin: r.focus_min as number,
    shortBreakMin: r.short_break_min as number,
    longBreakMin: r.long_break_min as number,
    sessionsBeforeLongBreak: r.sessions_before_long_break as number,
    autoStartNext: r.auto_start_next as boolean,
    soundEnabled: r.sound_enabled as boolean,
    waterGoalMl: r.water_goal_ml as number,
    waterReminderMin: r.water_reminder_min as number,
    waterReminderEnabled: r.water_reminder_enabled as boolean,
    stretchReminderMin: r.stretch_reminder_min as number,
    stretchReminderEnabled: r.stretch_reminder_enabled as boolean,
    notificationsEnabled: r.notifications_enabled as boolean,
  }
}

export async function dbUpsertSettings(s: SettingsRow) {
  const userId = uid()
  if (!userId) return
  await supabase.from('user_settings').upsert({
    user_id: userId,
    theme: s.theme,
    user_name: s.userName,
    focus_min: s.focusMin,
    short_break_min: s.shortBreakMin,
    long_break_min: s.longBreakMin,
    sessions_before_long_break: s.sessionsBeforeLongBreak,
    auto_start_next: s.autoStartNext,
    sound_enabled: s.soundEnabled,
    water_goal_ml: s.waterGoalMl,
    water_reminder_min: s.waterReminderMin,
    water_reminder_enabled: s.waterReminderEnabled,
    stretch_reminder_min: s.stretchReminderMin,
    stretch_reminder_enabled: s.stretchReminderEnabled,
    notifications_enabled: s.notificationsEnabled,
  })
}
