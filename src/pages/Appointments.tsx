import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { Plus, Pencil, Trash2, MapPin, Video, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent, Button, Input, Textarea, Label, Badge, PageHeader } from '@/components/ui/primitives'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAppointments } from '@/store/appointments'
import type { Appointment, ReminderLead } from '@/lib/types'

export default function Appointments() {
  const { appointments, add, update, remove } = useAppointments()
  const { toast } = useToast()
  const [tab, setTab] = useState('upcoming')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [presetDate, setPresetDate] = useState<string | undefined>()

  const now = Date.now()
  const sorted = [...appointments].sort((a, b) => a.start.localeCompare(b.start))
  const todayList = sorted.filter((a) => isSameDay(new Date(a.start), new Date()))
  const upcoming = sorted.filter((a) => new Date(a.start).getTime() >= now)

  const openNew = (date?: string) => {
    setEditing(null)
    setPresetDate(date)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appointments"
        subtitle="Your meetings and events in one place."
        action={
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> New appointment
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'today', label: 'Today' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'calendar', label: 'Calendar' },
        ]}
      />

      {tab === 'calendar' ? (
        <CalendarView appointments={sorted} onPick={(d) => openNew(d)} />
      ) : (
        <AppointmentList
          items={tab === 'today' ? todayList : upcoming}
          emptyText={tab === 'today' ? 'No appointments today.' : 'Nothing upcoming. Add your next meeting.'}
          onEdit={(a) => { setEditing(a); setPresetDate(undefined); setDialogOpen(true) }}
          onDelete={(id) => { remove(id); toast({ kind: 'info', title: 'Appointment removed' }) }}
        />
      )}

      <AppointmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        appointment={editing}
        presetDate={presetDate}
        onSave={(data) => {
          if (editing) {
            update(editing.id, data)
            toast({ kind: 'success', title: 'Appointment updated' })
          } else {
            add(data)
            toast({ kind: 'success', title: 'Appointment added' })
          }
          setDialogOpen(false)
        }}
      />
    </div>
  )
}

function AppointmentList({
  items,
  emptyText,
  onEdit,
  onDelete,
}: {
  items: Appointment[]
  emptyText: string
  onEdit: (a: Appointment) => void
  onDelete: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="grid place-items-center gap-2 py-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-2xl">📅</div>
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      {items.map((a) => {
        const start = new Date(a.start)
        const end = new Date(start.getTime() + a.durationMin * 60000)
        return (
          <Card key={a.id} className="group">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-accent py-2 text-accent-foreground">
                <span className="text-xs font-medium uppercase">{format(start, 'MMM')}</span>
                <span className="text-xl font-bold">{format(start, 'd')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(a)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(a.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {format(start, 'EEE, MMM d · h:mm a')} – {format(end, 'h:mm a')}
                </p>
                {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {a.location && (
                    <Badge tone="muted"><MapPin className="h-3 w-3" /> {a.location}</Badge>
                  )}
                  {a.meetingLink && (
                    <a href={a.meetingLink} target="_blank" rel="noreferrer">
                      <Badge tone="primary"><Video className="h-3 w-3" /> Join</Badge>
                    </a>
                  )}
                  {a.reminderLead > 0 && <Badge tone="muted">🔔 {a.reminderLead}m before</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function CalendarView({ appointments, onPick }: { appointments: Appointment[]; onPick: (date: string) => void }) {
  const [cursor, setCursor] = useState(new Date())
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor))
    const end = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of appointments) {
      const key = a.start.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [appointments])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{format(cursor, 'MMMM yyyy')}</h3>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" onClick={() => setCursor(subMonths(cursor, 1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
            <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, 'yyyy-MM-dd')
            const items = byDay.get(key) ?? []
            const muted = !isSameMonth(d, cursor)
            return (
              <button
                key={key}
                onClick={() => onPick(key)}
                className={`min-h-[72px] rounded-lg border p-1.5 text-left transition-colors hover:border-primary ${
                  isToday(d) ? 'border-primary bg-accent/40' : 'border-border'
                } ${muted ? 'opacity-40' : ''}`}
              >
                <span className={`text-xs font-medium ${isToday(d) ? 'text-primary' : ''}`}>{format(d, 'd')}</span>
                <div className="mt-1 space-y-0.5">
                  {items.slice(0, 2).map((a) => (
                    <div key={a.id} className="truncate rounded bg-primary/15 px-1 py-0.5 text-[10px] text-primary">
                      {format(new Date(a.start), 'h:mma')} {a.title}
                    </div>
                  ))}
                  {items.length > 2 && <div className="text-[10px] text-muted-foreground">+{items.length - 2} more</div>}
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function AppointmentDialog({
  open,
  onClose,
  appointment,
  presetDate,
  onSave,
}: {
  open: boolean
  onClose: () => void
  appointment: Appointment | null
  presetDate?: string
  onSave: (data: Omit<Appointment, 'id' | 'createdAt'>) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [durationMin, setDurationMin] = useState(30)
  const [reminderLead, setReminderLead] = useState<ReminderLead>(15)

  useEffect(() => {
    if (!open) return
    const s = appointment ? new Date(appointment.start) : null
    setTitle(appointment?.title ?? '')
    setDescription(appointment?.description ?? '')
    setLocation(appointment?.location ?? '')
    setMeetingLink(appointment?.meetingLink ?? '')
    setDate(s ? format(s, 'yyyy-MM-dd') : presetDate ?? format(new Date(), 'yyyy-MM-dd'))
    setTime(s ? format(s, 'HH:mm') : '09:00')
    setDurationMin(appointment?.durationMin ?? 30)
    setReminderLead(appointment?.reminderLead ?? 15)
  }, [open, appointment, presetDate])

  const submit = () => {
    if (!title.trim() || !date) return
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      meetingLink: meetingLink.trim() || undefined,
      start: new Date(`${date}T${time}`).toISOString(),
      durationMin,
      reminderLead,
      reminderFired: false,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title={appointment ? 'Edit appointment' : 'New appointment'}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Standup, 1:1, demo…" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Agenda or notes…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (min)</Label>
            <Input type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Reminder</Label>
            <Select
              value={String(reminderLead)}
              onChange={(e) => setReminderLead(Number(e.target.value) as ReminderLead)}
              options={[
                { value: '0', label: 'At start' },
                { value: '15', label: '15 min before' },
                { value: '30', label: '30 min before' },
                { value: '60', label: '1 hour before' },
              ]}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / Zoom" />
          </div>
          <div className="space-y-1.5">
            <Label>Meeting link</Label>
            <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://…" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!title.trim()}>{appointment ? 'Save' : 'Add'}</Button>
      </DialogFooter>
    </Dialog>
  )
}
