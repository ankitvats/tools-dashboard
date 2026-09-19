import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, CalendarDays, Flag, Pencil, Plus, Repeat2, Search, SkipForward, Tag, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Label, PageHeader, Progress, Textarea } from '@/components/ui/primitives'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useTasks } from '@/store/tasks'
import type { Priority, RecurrenceFrequency, Task, TaskSchedule } from '@/lib/types'
import { getActiveOccurrences, getOccurrencesInRange, getTaskSchedule, isOccurrenceDone, occurrenceMeta, scheduleSummary, type TaskOccurrence } from '@/lib/tasks'
import { cn, dayKey } from '@/lib/utils'

type TaskTab = 'today' | 'upcoming' | 'all'
type Row = { task: Task; occurrence?: TaskOccurrence }

const priorityTone: Record<Priority, 'muted' | 'warning' | 'destructive'> = { low: 'muted', medium: 'warning', high: 'destructive' }
const priorityDot: Record<Priority, string> = { low: 'bg-muted-foreground/50', medium: 'bg-warning', high: 'bg-destructive' }
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function addDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return dayKey(date)
}

export default function Tasks() {
  const { tasks, completions, add, update, remove, toggle, skipOccurrence } = useTasks()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') ?? 'today') as TaskTab
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('all')
  const [category, setCategory] = useState('all')
  const [hideDone, setHideDone] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const actionHandled = useRef(false)
  const today = dayKey()

  const setTab = (value: string) => setSearchParams((current) => {
    const next = new URLSearchParams(current)
    next.set('tab', value)
    return next
  }, { replace: true })

  useEffect(() => {
    if (!actionHandled.current && searchParams.get('action') === 'new') {
      actionHandled.current = true
      setEditing(null)
      setDialogOpen(true)
      setSearchParams((current) => { const next = new URLSearchParams(current); next.delete('action'); return next }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey && !dialogOpen && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        event.preventDefault(); setEditing(null); setDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dialogOpen])

  const categories = useMemo(() => Array.from(new Set(tasks.map((task) => task.category).filter(Boolean)) as Set<string>), [tasks])
  const rows = useMemo<Row[]>(() => {
    if (tab === 'all') return tasks.map((task) => ({ task }))
    if (tab === 'today') return getActiveOccurrences(tasks, completions, today).map((occurrence) => ({ task: occurrence.task, occurrence }))
    return tasks.flatMap((task) => getOccurrencesInRange(task, addDays(today, 1), addDays(today, 30), completions)
      .filter((occurrence) => occurrence.availableFrom >= today && occurrence.status !== 'completed' && occurrence.status !== 'skipped')
      .map((occurrence) => ({ task, occurrence })))
  }, [tab, tasks, completions, today])

  const filtered = useMemo(() => rows.filter(({ task, occurrence }) => {
    const haystack = `${task.title} ${task.notes ?? ''}`.toLowerCase()
    const done = occurrence ? isOccurrenceDone(occurrence) : task.completed
    return (!query || haystack.includes(query.toLowerCase())) &&
      (priority === 'all' || task.priority === priority) &&
      (category === 'all' || task.category === category) &&
      (!hideDone || !done)
  }).sort((a, b) => {
    const doneA = a.occurrence ? isOccurrenceDone(a.occurrence) : a.task.completed
    const doneB = b.occurrence ? isOccurrenceDone(b.occurrence) : b.task.completed
    if (doneA !== doneB) return doneA ? 1 : -1
    if (a.occurrence && b.occurrence) return a.occurrence.dueDate.localeCompare(b.occurrence.dueDate)
    return a.task.order - b.task.order
  }), [rows, query, priority, category, hideDone])

  const doneCount = filtered.filter(({ task, occurrence }) => occurrence ? isOccurrenceDone(occurrence) : task.completed).length
  const progress = filtered.length ? Math.round(doneCount / filtered.length * 100) : 0
  const removeTask = (task: Task) => { remove(task.id); toast({ kind: 'info', title: `Deleted “${task.title}”` }) }

  return <div className="space-y-5">
    <PageHeader title="Tasks" subtitle="Plan recurring work, then focus on what is actionable now." action={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4" /> New task</Button>} />
    <div className="flex flex-wrap items-center gap-3">
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'all', label: 'All tasks' }]} />
      <div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks…" className="pl-9" /></div>
      <Select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-36" options={[{ value: 'all', label: 'All priority' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
      {categories.length > 0 && <Select value={category} onChange={(event) => setCategory(event.target.value)} className="w-40" options={[{ value: 'all', label: 'All categories' }, ...categories.map((value) => ({ value, label: value }))]} />}
      <button onClick={() => setHideDone((value) => !value)} className={cn('rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors', hideDone ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:bg-secondary')}>{hideDone ? 'Show done' : 'Hide done'}</button>
    </div>
    {filtered.length > 0 && <div className="flex items-center gap-3"><Progress value={progress} className="flex-1" indicatorClass="bg-success" /><span className="text-sm font-medium text-muted-foreground tabular-nums">{doneCount}/{filtered.length}</span></div>}
    <Card><CardContent className="p-2">{filtered.length === 0 ? <EmptyState tab={tab} /> : <ul className="divide-y divide-border">{filtered.map((row) => <TaskRow key={row.occurrence ? `${row.task.id}-${row.occurrence.occurrenceKey}` : row.task.id} {...row} onToggle={() => toggle(row.task.id, row.occurrence?.occurrenceKey)} onSkip={() => row.occurrence && skipOccurrence(row.task.id, row.occurrence.occurrenceKey)} onEdit={() => { setEditing(row.task); setDialogOpen(true) }} onDelete={() => removeTask(row.task)} />)}</ul>}</CardContent></Card>
    <TaskDialog open={dialogOpen} task={editing} onClose={() => setDialogOpen(false)} onSave={(data) => { if (editing) { update(editing.id, data); toast({ kind: 'success', title: 'Task updated' }) } else { add(data); toast({ kind: 'success', title: 'Task created' }) }; setDialogOpen(false) }} />
  </div>
}

function EmptyState({ tab }: { tab: TaskTab }) {
  const message = tab === 'today' ? 'No tasks are actionable today.' : tab === 'upcoming' ? 'No scheduled tasks in the next 30 days.' : 'No tasks match your filters.'
  return <div className="grid place-items-center gap-2 py-14 text-center"><div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-2xl">🗒️</div><p className="text-sm text-muted-foreground">{message}</p></div>
}

function TaskRow({ task, occurrence, onToggle, onSkip, onEdit, onDelete }: Row & { onToggle: () => void; onSkip: () => void; onEdit: () => void; onDelete: () => void }) {
  const done = occurrence ? isOccurrenceDone(occurrence) : task.completed
  const schedule = getTaskSchedule(task)
  const detail = occurrence ? occurrenceMeta(occurrence) : scheduleSummary(task)
  return <li className="group flex items-center gap-3 px-3 py-3">
    <button onClick={onToggle} aria-label={done ? 'Mark incomplete' : 'Mark complete'} className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', done ? 'border-success bg-success text-white' : 'border-border hover:border-primary')}>{done && <span className="text-[11px] leading-none">✓</span>}</button><span className={cn('h-2 w-2 shrink-0 rounded-full', priorityDot[task.priority])} title={`${task.priority} priority`} />
    <div className="min-w-0 flex-1"><p className={cn('truncate text-sm font-medium', done && 'text-muted-foreground line-through')}>{task.title}</p><div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{schedule && <span className="inline-flex items-center gap-0.5 font-medium text-primary"><Repeat2 className="h-3 w-3" /> {scheduleSummary(task)}</span>}{occurrence && <span>· {detail}</span>}{!occurrence && !schedule && task.dueDate && <span>· due {task.dueDate}</span>}{task.category && <span className="inline-flex items-center gap-0.5">· <Tag className="h-3 w-3" /> {task.category}</span>}{task.reminderAt && !schedule && <span className="inline-flex items-center gap-0.5">· <Bell className="h-3 w-3" /> reminder set</span>}</div></div>
    <Badge tone={priorityTone[task.priority]} className="hidden sm:inline-flex"><Flag className="h-3 w-3" /> {task.priority}</Badge><div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">{occurrence && !done && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onSkip} aria-label="Skip this occurrence"><SkipForward className="h-4 w-4" /></Button>}<Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label="Edit schedule"><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></div>
  </li>
}

function TaskDialog({ open, onClose, task, onSave }: { open: boolean; onClose: () => void; task: Task | null; onSave: (data: Partial<Task> & { title: string; priority: Priority }) => void }) {
  const [title, setTitle] = useState(''); const [notes, setNotes] = useState(''); const [priority, setPriority] = useState<Priority>('medium'); const [category, setCategory] = useState(''); const [dueDate, setDueDate] = useState(dayKey()); const [reminder, setReminder] = useState('')
  const [mode, setMode] = useState<'none' | RecurrenceFrequency>('none'); const [interval, setInterval] = useState('1'); const [weekdays, setWeekdays] = useState<number[]>([]); const [monthDay, setMonthDay] = useState('1'); const [startsOn, setStartsOn] = useState(dayKey()); const [endsOn, setEndsOn] = useState(''); const [leadDays, setLeadDays] = useState('0'); const [showAdvancedSchedule, setShowAdvancedSchedule] = useState(false); const [recurringReminder, setRecurringReminder] = useState(false); const [reminderTiming, setReminderTiming] = useState<'available' | 'due'>('available'); const [reminderTime, setReminderTime] = useState('09:00')
  useEffect(() => { if (!open) return; const schedule = task ? getTaskSchedule(task) : undefined; setTitle(task?.title ?? ''); setNotes(task?.notes ?? ''); setPriority(task?.priority ?? 'medium'); setCategory(task?.category ?? ''); setDueDate(task?.dueDate ?? dayKey()); setReminder(task?.reminderAt ? task.reminderAt.slice(0, 16) : ''); setMode(schedule?.frequency ?? 'none'); setInterval(String(schedule?.interval ?? 1)); setWeekdays(schedule?.weekdays ?? []); setMonthDay(String(schedule?.monthDay ?? new Date(`${schedule?.startsOn ?? dayKey()}T12:00:00`).getDate())); setStartsOn(schedule?.startsOn ?? dayKey()); setEndsOn(schedule?.endsOn ?? ''); setLeadDays(String(schedule?.visibilityLeadDays ?? 0)); setShowAdvancedSchedule(false); setRecurringReminder(Boolean(task?.recurringReminder)); setReminderTiming(task?.recurringReminder?.timing ?? 'available'); setReminderTime(task?.recurringReminder?.time ?? '09:00') }, [open, task])
  const schedule: TaskSchedule | undefined = mode === 'none' ? undefined : { frequency: mode, interval: Math.max(1, Number(interval) || 1), startsOn, endsOn: endsOn || undefined, weekdays: mode === 'weekly' ? (weekdays.length ? weekdays : [new Date(`${startsOn}T12:00:00`).getDay()]) : undefined, monthDay: mode === 'monthly' || mode === 'yearly' ? (monthDay === 'last' ? 'last' : Math.min(31, Math.max(1, Number(monthDay) || 1))) : undefined, month: mode === 'yearly' ? new Date(`${startsOn}T12:00:00`).getMonth() + 1 : undefined, visibilityLeadDays: Math.max(0, Number(leadDays) || 0) }
  const preview = schedule ? `${scheduleSummary({ ...(task ?? {}), id: '', title: '', completed: false, priority, order: 0, createdAt: new Date().toISOString(), schedule } as Task)}${schedule.visibilityLeadDays ? ` · visible ${schedule.visibilityLeadDays} days before due` : ' · visible on due date'}` : 'A one-time task'
  const submit = () => { if (!title.trim()) return; onSave({ title: title.trim(), notes: notes.trim() || undefined, priority, category: category.trim() || undefined, dueDate: schedule ? undefined : dueDate || undefined, repeat: schedule?.frequency ?? 'none', schedule, reminderAt: schedule ? undefined : reminder ? new Date(reminder).toISOString() : undefined, reminderFired: false, recurringReminder: schedule && recurringReminder ? { timing: reminderTiming, time: reminderTime } : undefined }) }
  const toggleWeekday = (day: number) => setWeekdays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day])
  const visibilityOptions = [
    { value: '0', label: 'On the due date' }, { value: '1', label: '1 day early' },
    { value: '3', label: '3 days early' }, { value: '7', label: '1 week early' },
    { value: '14', label: '2 weeks early' }, { value: '30', label: '1 month early' },
    ...(leadDays && !['0', '1', '3', '7', '14', '30'].includes(leadDays) ? [{ value: leadDays, label: `${leadDays} days early` }] : []),
  ]
  const intervalUnit = mode === 'daily' ? 'days' : mode === 'weekly' ? 'weeks' : mode === 'monthly' ? 'months' : 'years'
  return <Dialog open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}><div className="space-y-4">
    <div className="space-y-1.5"><Label>Title</Label><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs doing?" onKeyDown={(event) => event.key === 'Enter' && submit()} /></div>
    <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional details…" /></div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Priority</Label><Select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} /></div><div className="space-y-1.5"><Label>Category</Label><Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Work" /></div></div>
    <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><Label>Schedule</Label></div>
      <Select value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setShowAdvancedSchedule(false) }} options={[{ value: 'none', label: 'One time' }, { value: 'daily', label: 'Every day' }, { value: 'weekly', label: 'Every week' }, { value: 'monthly', label: 'Every month' }, { value: 'yearly', label: 'Every year' }]} />
      {mode === 'none' ? <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div> : <>
        {mode === 'weekly' && <div className="space-y-1.5"><Label>Repeat on</Label><div className="flex flex-wrap gap-1">{WEEKDAYS.map((name, day) => <button key={name} type="button" onClick={() => toggleWeekday(day)} className={cn('rounded-md border px-2 py-1 text-xs font-medium', weekdays.includes(day) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary')}>{name}</button>)}</div></div>}
        {(mode === 'monthly' || mode === 'yearly') && <div className="space-y-1.5"><Label>Due on</Label><Select value={monthDay} onChange={(event) => setMonthDay(event.target.value)} options={[...Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1), label: `${index + 1}${ordinal(index + 1)}` })), { value: 'last', label: 'Last day of month' }]} /></div>}
        <div className="space-y-1.5"><Label>Make this task available</Label><Select value={leadDays} onChange={(event) => setLeadDays(event.target.value)} options={visibilityOptions} /></div>
        <p className="rounded-md bg-background px-2.5 py-2 text-xs text-muted-foreground"><Repeat2 className="mr-1 inline h-3.5 w-3.5 text-primary" />{preview}</p>
        <button type="button" onClick={() => setShowAdvancedSchedule((value) => !value)} className="text-xs font-medium text-primary hover:underline">{showAdvancedSchedule ? 'Hide schedule options' : 'More schedule options'}</button>
        {showAdvancedSchedule && <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-background p-3"><div className="space-y-1.5"><Label>Repeat every ({intervalUnit})</Label><Input type="number" min="1" value={interval} onChange={(event) => setInterval(event.target.value)} /></div><div className="space-y-1.5"><Label>First due date</Label><Input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></div><div className="col-span-2 space-y-1.5"><Label>Stop repeating (optional)</Label><Input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></div></div>}
      </>}
    </div>
    {schedule ? <div className="space-y-2 rounded-lg border border-border p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={recurringReminder} onChange={(event) => setRecurringReminder(event.target.checked)} /> Reminder for each occurrence</label>{recurringReminder && <div className="grid grid-cols-2 gap-3"><Select value={reminderTiming} onChange={(event) => setReminderTiming(event.target.value as 'available' | 'due')} options={[{ value: 'available', label: 'When it becomes available' }, { value: 'due', label: 'On the due date' }]} /><Input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></div>}</div> : <div className="space-y-1.5"><Label>Reminder</Label><Input type="datetime-local" value={reminder} onChange={(event) => setReminder(event.target.value)} /></div>}
  </div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!title.trim()}>{task ? 'Save changes' : 'Create task'}</Button></DialogFooter></Dialog>
}

function ordinal(value: number): string { const mod = value % 100; if (mod >= 11 && mod <= 13) return 'th'; return value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th' }