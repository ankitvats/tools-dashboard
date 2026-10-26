import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Label, PageHeader } from '@/components/ui/primitives'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/store/auth'
import { useExercise } from '@/store/exercise'
import { dayKey } from '@/lib/utils'
import {
  EMPTY_EXERCISE_DATA, EXERCISES, QUICK_EXERCISES, UNIT_LABELS,
  exercisePreset, formatExerciseValues, searchExercises, validExerciseDay, validExerciseValues,
  type Exercise, type ExerciseEntry, type ExerciseUnit,
} from '@/lib/exercises'

interface LogDraft {
  exercise: Exercise
  sets: number
  quantity: number
  entryId?: string
}

function LogDialog({ draft, day, onClose, onSave }: {
  draft: LogDraft
  day: string
  onClose: () => void
  onSave: (sets: number, quantity: number) => void
}) {
  const [sets, setSets] = useState(String(draft.sets))
  const [quantity, setQuantity] = useState(String(draft.quantity))
  const valid = validExerciseValues(Number(sets), Number(quantity))
  return (
    <Dialog open onClose={onClose} title={`${draft.entryId ? 'Edit' : 'Log'} ${draft.exercise.name}`} description={`Recording for ${day}`}>
      <form onSubmit={(event) => { event.preventDefault(); if (valid) onSave(Number(sets), Number(quantity)) }}>
        {draft.exercise.guidance && <p className="mb-4 text-sm text-muted-foreground">{draft.exercise.guidance}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="exercise-sets">Sets</Label>
            <Input autoFocus id="exercise-sets" type="number" inputMode="numeric" min={1} max={100} step={1} required value={sets} onChange={(event) => setSets(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exercise-quantity">{UNIT_LABELS[draft.exercise.unit]} per set</Label>
            <Input id="exercise-quantity" type="number" inputMode="numeric" min={1} max={86400} step={1} required value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Use the same count for each set. Default values are editable, not workout recommendations.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!valid}>{draft.entryId ? 'Save changes' : 'Log exercise'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function CustomExerciseDialog({ initialName, onClose, onSave }: {
  initialName: string
  onClose: () => void
  onSave: (name: string, unit: ExerciseUnit) => void
}) {
  const [name, setName] = useState(initialName)
  const [unit, setUnit] = useState<ExerciseUnit>('reps')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSave(name, unit)
  }
  return (
    <Dialog open onClose={onClose} title="Add an exercise" description="Your exercise will appear in search and is private to your account.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="custom-exercise-name">Exercise name</Label>
          <Input autoFocus id="custom-exercise-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="e.g. Reverse lunges" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-exercise-unit">Measure each set in</Label>
          <select id="custom-exercise-unit" value={unit} onChange={(event) => setUnit(event.target.value as ExerciseUnit)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-ring">
            <option value="reps">Repetitions</option>
            <option value="seconds">Seconds</option>
            <option value="rounds">Rounds</option>
          </select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim()}>Add and log</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

function ExercisePage({ userId }: { userId: string }) {
  const data = useExercise((state) => state.byUser[userId] ?? EMPTY_EXERCISE_DATA)
  const syncing = useExercise((state) => state.syncing[userId] ?? false)
  const syncError = useExercise((state) => state.errors[userId])
  const { addCustom, log, remove, syncFromDB } = useExercise()
  const { toast } = useToast()
  const [day, setDay] = useState(dayKey)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<LogDraft | null>(null)
  const [customName, setCustomName] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ExerciseEntry | null>(null)
  const lastQuickLog = useRef({ exerciseId: '', at: 0 })

  useEffect(() => {
    const retry = () => { void syncFromDB(userId) }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [userId, syncFromDB])

  const exercises = [...EXERCISES, ...data.customExercises]
  const results = searchExercises(exercises, query)
  const entries = data.entries.filter((entry) => entry.day === day).sort((a, b) => b.at.localeCompare(a.at))
  const totalSets = entries.reduce((total, entry) => total + entry.sets, 0)
  const exerciseCount = new Set(entries.map((entry) => entry.exerciseId)).size
  const pendingIds = new Set(data.pending.flatMap((mutation) => mutation.kind === 'entry' ? [mutation.entry.id] : []))
  const today = dayKey()

  const reportError = (error: unknown) => toast({
    kind: 'warning', title: error instanceof Error ? error.message : 'Could not log this exercise.',
  })

  const openLog = (exercise: Exercise) => setDraft({ exercise, ...exercisePreset(exercise, data.entries) })

  const saveLog = (exercise: Exercise, sets: number, quantity: number, entryId?: string) => {
    try {
      const entry = log(userId, exercise, sets, quantity, day, entryId)
      setDraft(null)
      toast({
        kind: 'success', title: entryId ? 'Exercise updated' : `${exercise.name} logged`,
        description: `${formatExerciseValues(sets, quantity, exercise.unit)} · ${day}`,
        ...(!entryId ? { action: { label: 'Undo', onClick: () => {
          try { remove(userId, entry.id) } catch (error) { reportError(error) }
        } } } : {}),
      })
    } catch (error) { reportError(error) }
  }

  const quickLog = (exercise: Exercise) => {
    const now = Date.now()
    if (lastQuickLog.current.exerciseId === exercise.id && now - lastQuickLog.current.at < 750) return
    lastQuickLog.current = { exerciseId: exercise.id, at: now }
    const preset = exercisePreset(exercise, data.entries)
    saveLog(exercise, preset.sets, preset.quantity)
  }

  const shiftDay = (offset: number) => {
    const date = new Date(`${day}T12:00:00`)
    date.setDate(date.getDate() + offset)
    setDay(dayKey(date))
  }

  const editEntry = (entry: ExerciseEntry) => {
    const exercise = exercises.find((item) => item.id === entry.exerciseId)
    setDraft({
      exercise: {
        ...exercise, id: entry.exerciseId, name: entry.exerciseName, unit: entry.unit,
        category: exercise?.category ?? 'Custom', defaultSets: entry.sets, defaultQuantity: entry.quantity,
      },
      sets: entry.sets, quantity: entry.quantity, entryId: entry.id,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exercise" subtitle="A little movement, logged every day." action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
          <Input aria-label="Log date" type="date" value={day} max={today} className="w-40" onChange={(event) => {
            if (validExerciseDay(event.target.value) && event.target.value <= today) setDay(event.target.value)
          }} />
          <Button variant="outline" size="icon" disabled={day >= today} onClick={() => shiftDay(1)} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
          {day !== today && <Button variant="ghost" size="sm" onClick={() => setDay(today)}>Today</Button>}
        </div>
      } />

      {(syncError || data.pending.length > 0) && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary p-4 text-sm">
          <p>{syncError ?? `Saving ${data.pending.length} change${data.pending.length === 1 ? '' : 's'}…`}</p>
          {syncError && <Button variant="outline" size="sm" disabled={syncing} onClick={() => { void syncFromDB(userId) }}>{syncing ? 'Retrying…' : 'Retry sync'}</Button>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-5 py-4">
        <p className="font-semibold">{day === today ? 'Today' : day}</p>
        <p className="text-sm text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{exerciseCount}</span> exercises</p>
        <p className="text-sm text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{totalSets}</span> sets logged</p>
      </div>

      <section aria-labelledby="exercise-quick-heading" className="space-y-3">
        <div>
          <h2 id="exercise-quick-heading" className="font-semibold">Quick log</h2>
          <p className="text-sm text-muted-foreground">One tap logs the values shown for {day === today ? 'today' : day}. Adjust them any time.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_EXERCISES.map((exercise) => {
            const preset = exercisePreset(exercise, data.entries)
            const description = formatExerciseValues(preset.sets, preset.quantity, exercise.unit)
            return (
              <Card key={exercise.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{exercise.name}</h3>
                    <Badge tone="muted">{exercise.category}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => quickLog(exercise)} aria-label={`Log ${exercise.name}: ${description}`}><Plus className="h-4 w-4" />{description}</Button>
                    <Button variant="outline" size="icon" onClick={() => openLog(exercise)} aria-label={`Adjust ${exercise.name}`}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Find an exercise</h2>
            <Button variant="outline" size="sm" onClick={() => setCustomName(query.trim().slice(0, 80))}><Plus className="h-4 w-4" />Add exercise</Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search exercises" placeholder="Search exercises, yoga poses, or add your own…" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" />
          </div>
          <ul className="mt-3 max-h-72 overflow-y-auto divide-y divide-border" aria-label="Exercise library">
            {results.map((exercise) => (
              <li key={exercise.id}>
                <button onClick={() => openLog(exercise)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary focus-ring">
                  <span><span className="block text-sm font-medium">{exercise.name}</span><span className="text-xs text-muted-foreground">{exercise.category} · {UNIT_LABELS[exercise.unit]}</span></span>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          {results.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No matching exercises. Add “{query.trim()}” as your own exercise.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold">{day === today ? "Today's log" : `Log for ${day}`}</h2>
          {entries.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing logged yet. Tap a quick-log button or search for an exercise above.</p> : (
            <ul className="mt-3 divide-y divide-border">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{entry.exerciseName}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">{formatExerciseValues(entry.sets, entry.quantity, entry.unit)}{pendingIds.has(entry.id) && <span className="ml-2 text-xs">· Pending sync</span>}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => editEntry(entry)} aria-label={`Edit ${entry.exerciseName} entry`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(entry)} aria-label={`Delete ${entry.exerciseName} entry`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {draft && <LogDialog draft={draft} day={day} onClose={() => setDraft(null)} onSave={(sets, quantity) => saveLog(draft.exercise, sets, quantity, draft.entryId)} />}
      {customName !== null && <CustomExerciseDialog initialName={customName} onClose={() => setCustomName(null)} onSave={(name, unit) => {
        try {
          const exercise = addCustom(userId, name, unit)
          setCustomName(null)
          setQuery('')
          openLog(exercise)
        } catch (error) { reportError(error) }
      }} />}
      {deleting && <Dialog open onClose={() => setDeleting(null)} title="Delete exercise entry?" description={`Remove ${deleting.exerciseName} (${formatExerciseValues(deleting.sets, deleting.quantity, deleting.unit)}) from ${deleting.day}?`}>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => {
            try {
              remove(userId, deleting.id)
              setDeleting(null)
              toast({ kind: 'info', title: 'Exercise entry deleted' })
            } catch (error) { reportError(error) }
          }}>Delete entry</Button>
        </DialogFooter>
      </Dialog>}
    </div>
  )
}

export default function Exercise() {
  const userId = useAuth((state) => state.user?.id)
  return userId ? <ExercisePage key={userId} userId={userId} /> : null
}