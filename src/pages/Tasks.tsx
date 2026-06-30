import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, Trash2, Pencil, GripVertical, Flag, Bell, Tag, Repeat2 } from 'lucide-react'
import { Card, CardContent, Button, Input, Textarea, Label, Badge, Progress, Switch, PageHeader } from '@/components/ui/primitives'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useTasks } from '@/store/tasks'
import type { Priority, Repeat, Task } from '@/lib/types'
import { isTaskDone, isToday } from '@/lib/tasks'
import { dayKey, cn } from '@/lib/utils'

const priorityTone: Record<Priority, 'muted' | 'warning' | 'destructive'> = {
  low: 'muted',
  medium: 'warning',
  high: 'destructive',
}
const priorityDot: Record<Priority, string> = {
  low: 'bg-muted-foreground/50',
  medium: 'bg-warning',
  high: 'bg-destructive',
}

export default function Tasks() {
  const { tasks, add, update, remove, toggle, reorder } = useTasks()
  const { toast } = useToast()

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') ?? 'today') as 'today' | 'all'
  const setTab = (v: string) =>
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', v); return n }, { replace: true })
  const [query, setQuery] = useState('')
  const actionHandled = useRef(false)
  const [priFilter, setPriFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [hideDone, setHideDone] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dragId = useRef<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        e.key === 'n' &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !dialogOpen &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        e.preventDefault()
        setEditing(null)
        setDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dialogOpen])

  useEffect(() => {
    if (!actionHandled.current && searchParams.get('action') === 'new') {
      actionHandled.current = true
      setEditing(null)
      setDialogOpen(true)
      setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('action'); return n }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const categories = useMemo(() => Array.from(new Set(tasks.map((t) => t.category).filter(Boolean))) as string[], [tasks])

  const filtered = useMemo(() => {
    const today = dayKey()
    let list = [...tasks].sort((a, b) => a.order - b.order)
    if (tab === 'today') list = list.filter((t) => isToday(t, today))
    if (query) list = list.filter((t) => (t.title + ' ' + (t.notes ?? '')).toLowerCase().includes(query.toLowerCase()))
    if (priFilter !== 'all') list = list.filter((t) => t.priority === priFilter)
    if (catFilter !== 'all') list = list.filter((t) => t.category === catFilter)
    if (hideDone) list = list.filter((t) => !isTaskDone(t))
    list = list.filter((t) => !deletingIds.has(t.id))
    return list
  }, [tasks, tab, query, priFilter, catFilter, hideDone, deletingIds])

  const completed = filtered.filter((t) => isTaskDone(t)).length
  const progress = filtered.length ? Math.round((completed / filtered.length) * 100) : 0

  const scheduleDelete = (id: string, title: string) => {
    setDeletingIds((prev) => new Set([...prev, id]))
    const timer = setTimeout(() => {
      remove(id)
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      deleteTimers.current.delete(id)
    }, 5000)
    deleteTimers.current.set(id, timer)
    toast({
      kind: 'info',
      title: `"${title.length > 30 ? title.slice(0, 30) + '…' : title}" deleted`,
      durationMs: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(deleteTimers.current.get(id))
          deleteTimers.current.delete(id)
          setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
        },
      },
    })
  }

  const onDrop = (targetId: string) => {
    if (!dragId.current || dragId.current === targetId) return
    const ordered = [...tasks].sort((a, b) => a.order - b.order).map((t) => t.id)
    const from = ordered.indexOf(dragId.current)
    const to = ordered.indexOf(targetId)
    ordered.splice(to, 0, ordered.splice(from, 1)[0])
    reorder(ordered)
    dragId.current = null
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        subtitle="Capture, prioritize, and finish what matters."
        action={
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'today', label: 'Today' },
            { value: 'all', label: 'All tasks' },
          ]}
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" className="pl-9" />
        </div>
        <Select
          value={priFilter}
          onChange={(e) => setPriFilter(e.target.value)}
          className="w-36"
          options={[
            { value: 'all', label: 'All priority' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />
        {categories.length > 0 && (
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-36"
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
        )}
        <button
          onClick={() => setHideDone((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
            hideDone ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {hideDone ? 'Show done' : 'Hide done'}
        </button>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1" indicatorClass="bg-success" />
          <span className="text-sm font-medium text-muted-foreground tabular-nums">{completed}/{filtered.length}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-2">
          {filtered.length === 0 ? (
            <div className="grid place-items-center gap-2 py-14 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-2xl">🗒️</div>
              <p className="text-sm text-muted-foreground">
                {tab === 'today' ? 'No tasks due today.' : 'No tasks match your filters.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {filtered.map((t) => (
                  <motion.li
                    key={t.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    draggable={tab === 'all'}
                    onDragStart={() => (dragId.current = t.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(t.id)}
                    className="group flex items-center gap-3 px-3 py-3"
                  >
                    {tab === 'all' && (
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40 group-hover:text-muted-foreground" />
                    )}
                    <button
                      onClick={() => toggle(t.id)}
                      aria-label={isTaskDone(t) ? 'Mark incomplete' : 'Mark complete'}
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                        isTaskDone(t) ? 'border-success bg-success text-white' : 'border-border hover:border-primary',
                      )}
                    >
                      {isTaskDone(t) && <span className="text-[11px] leading-none">✓</span>}
                    </button>
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityDot[t.priority])} title={`${t.priority} priority`} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', isTaskDone(t) && 'text-muted-foreground line-through')}>{t.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {t.repeat === 'daily' && (
                          <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                            <Repeat2 className="h-3 w-3" /> Daily
                          </span>
                        )}
                        {t.category && (
                          <span className="inline-flex items-center gap-0.5">
                            <Tag className="h-3 w-3" /> {t.category}
                          </span>
                        )}
                        {t.repeat !== 'daily' && t.dueDate && <span>· due {t.dueDate}</span>}
                        {t.reminderAt && (
                          <span className="inline-flex items-center gap-0.5">
                            · <Bell className="h-3 w-3" /> {new Date(t.reminderAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge tone={priorityTone[t.priority]} className="hidden sm:inline-flex">
                      <Flag className="h-3 w-3" /> {t.priority}
                    </Badge>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(t); setDialogOpen(true) }} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => scheduleDelete(t.id, t.title)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={editing}
        onSave={(data) => {
          if (editing) {
            update(editing.id, data)
            toast({ kind: 'success', title: 'Task updated' })
          } else {
            add(data)
            toast({ kind: 'success', title: 'Task created' })
          }
          setDialogOpen(false)
        }}
      />
    </div>
  )
}

function TaskDialog({
  open,
  onClose,
  task,
  onSave,
}: {
  open: boolean
  onClose: () => void
  task: Task | null
  onSave: (data: Partial<Task> & { title: string; priority: Priority }) => void
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reminder, setReminder] = useState('')
  const [daily, setDaily] = useState(false)

  // Load values whenever the dialog opens (or the target task changes).
  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setNotes(task?.notes ?? '')
    setPriority(task?.priority ?? 'medium')
    setCategory(task?.category ?? '')
    setDueDate(task?.dueDate ?? dayKey())
    setReminder(task?.reminderAt ? task.reminderAt.slice(0, 16) : '')
    setDaily(task?.repeat === 'daily')
  }, [open, task])

  const submit = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      category: category.trim() || undefined,
      // daily tasks recur every day, so a one-off due date doesn't apply
      dueDate: daily ? undefined : dueDate || undefined,
      repeat: (daily ? 'daily' : 'none') as Repeat,
      reminderAt: reminder ? new Date(reminder).toISOString() : undefined,
      reminderFired: false,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Work" />
          </div>
          {!daily && (
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Reminder</Label>
            <Input type="datetime-local" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-primary" />
            <div>
              <Label>Repeat daily</Label>
              <p className="text-xs text-muted-foreground">Shows every day and resets each morning. Appears once in All tasks.</p>
            </div>
          </div>
          <Switch checked={daily} onCheckedChange={setDaily} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!title.trim()}>{task ? 'Save changes' : 'Create task'}</Button>
      </DialogFooter>
    </Dialog>
  )
}
