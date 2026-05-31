import { useEffect, useRef, useState } from 'react'
import { Shuffle, Play, Check, Activity, Bell } from 'lucide-react'
import { Card, CardContent, Button, Ring, Badge, Switch, Label, PageHeader } from '@/components/ui/primitives'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { STRETCHES } from '@/lib/data'
import type { Stretch as StretchType } from '@/lib/types'
import { useStretch } from '@/store/stretch'
import { useSettings } from '@/store/settings'
import { dayKey, formatClock } from '@/lib/utils'
import { playChime } from '@/lib/notify'

export default function Stretch() {
  const { logs, log } = useStretch()
  const { stretchReminderEnabled, stretchReminderMin, soundEnabled, set } = useSettings()
  const { toast } = useToast()
  const [active, setActive] = useState<StretchType | null>(null)

  const todayCount = logs.filter((l) => l.day === dayKey()).length

  const startRandom = () => setActive(STRETCHES[Math.floor(Math.random() * STRETCHES.length)])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stretch"
        subtitle="Short movement breaks to beat desk fatigue."
        action={
          <Button onClick={startRandom}>
            <Shuffle className="h-4 w-4" /> Surprise me
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <Activity className="h-5 w-5 text-success" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{todayCount}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-3">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell className={stretchReminderEnabled ? 'h-5 w-5 text-primary' : 'h-5 w-5 text-muted-foreground'} />
              <div>
                <Label>Stretch reminders</Label>
                <p className="text-xs text-muted-foreground">Every {stretchReminderMin} min while open</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[1, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => set('stretchReminderMin', m)}
                  className={`hidden rounded-lg border px-2.5 py-1 text-xs sm:block ${stretchReminderMin === m ? 'border-primary bg-accent text-accent-foreground' : 'border-border'}`}
                >
                  {m}m
                </button>
              ))}
              <Switch checked={stretchReminderEnabled} onCheckedChange={(v) => set('stretchReminderEnabled', v)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STRETCHES.map((st) => (
          <Card key={st.id} className="group transition-all hover:-translate-y-0.5 hover:shadow-glow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-2xl">{st.icon}</span>
                <Badge tone="muted">{st.durationSec}s</Badge>
              </div>
              <h3 className="mt-3 font-semibold">{st.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{st.instructions}</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => setActive(st)}>
                <Play className="h-4 w-4" /> Start
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <StretchRunner
        stretch={active}
        onClose={() => setActive(null)}
        onComplete={(id) => {
          log(id)
          if (soundEnabled) playChime('success')
          toast({ kind: 'success', title: 'Nice stretch! 🤸', description: 'Logged for today.' })
          setActive(null)
        }}
      />
    </div>
  )
}

function StretchRunner({
  stretch,
  onClose,
  onComplete,
}: {
  stretch: StretchType | null
  onClose: () => void
  onComplete: (id: string) => void
}) {
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const idRef = useRef<number | null>(null)

  useEffect(() => {
    if (stretch) {
      setRemaining(stretch.durationSec)
      setRunning(true)
    }
  }, [stretch])

  useEffect(() => {
    if (!running || !stretch) return
    idRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(idRef.current!)
          setRunning(false)
          onComplete(stretch.id)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (idRef.current) window.clearInterval(idRef.current)
    }
  }, [running, stretch, onComplete])

  if (!stretch) return null
  const progress = ((stretch.durationSec - remaining) / stretch.durationSec) * 100

  return (
    <Dialog open={!!stretch} onClose={onClose} title={stretch.name}>
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="text-5xl">{stretch.icon}</div>
        <Ring value={progress} size={180} stroke={12} barClass="text-success">
          <p className="text-4xl font-bold tabular-nums">{formatClock(remaining)}</p>
        </Ring>
        <p className="text-center text-sm text-muted-foreground">{stretch.instructions}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setRunning((r) => !r)}>
            {running ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="success" onClick={() => onComplete(stretch.id)}>
            <Check className="h-4 w-4" /> Done
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
