import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Wind, Clock } from 'lucide-react'
import { Card, CardContent, Button, Badge, PageHeader } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useBreathing } from '@/store/breathing'
import { useSettings } from '@/store/settings'
import { dayKey } from '@/lib/utils'
import { playChime } from '@/lib/notify'

type PhaseKind = 'inhale' | 'hold' | 'exhale'
interface Phase {
  kind: PhaseKind
  secs: number
}
interface Technique {
  id: string
  name: string
  desc: string
  phases: Phase[]
}

const i = (secs: number): Phase => ({ kind: 'inhale', secs })
const h = (secs: number): Phase => ({ kind: 'hold', secs })
const e = (secs: number): Phase => ({ kind: 'exhale', secs })

const TECHNIQUES: Technique[] = [
  { id: 'box', name: 'Box breathing', desc: '4·4·4·4 — steady focus', phases: [i(4), h(4), e(4), h(4)] },
  { id: '478', name: '4-7-8 relax', desc: 'Wind down for sleep', phases: [i(4), h(7), e(8)] },
  { id: 'coherent', name: 'Coherent', desc: '5·5 — balance', phases: [i(5), e(5)] },
  { id: 'calm', name: 'Calming', desc: '4·2·6 — long exhale', phases: [i(4), h(2), e(6)] },
]

const ROUND_OPTIONS = [4, 6, 8, 10]
const MIN_SCALE = 0.5
const MAX_SCALE = 1

const PHASE_LABEL: Record<PhaseKind, string> = {
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out',
}

function scaleFor(phases: Phase[], idx: number): number {
  for (let k = idx; k >= 0; k--) {
    if (phases[k].kind !== 'hold') return phases[k].kind === 'inhale' ? MAX_SCALE : MIN_SCALE
  }
  return MIN_SCALE
}

function phaseAt(phases: Phase[], pos: number): { idx: number; secLeft: number } {
  let acc = 0
  for (let k = 0; k < phases.length; k++) {
    if (pos < acc + phases[k].secs) return { idx: k, secLeft: phases[k].secs - (pos - acc) }
    acc += phases[k].secs
  }
  return { idx: phases.length - 1, secLeft: 1 }
}

export default function Breathing() {
  const { logs, log } = useBreathing()
  const { soundEnabled } = useSettings()
  const { toast } = useToast()

  const [tech, setTech] = useState<Technique>(TECHNIQUES[0])
  const [target, setTarget] = useState(6)
  const [running, setRunning] = useState(false)
  const [total, setTotal] = useState(0) // seconds elapsed since start
  const doneRef = useRef(false)

  const cycle = useMemo(() => tech.phases.reduce((sum, p) => sum + p.secs, 0), [tech])
  const totalTarget = cycle * target

  // tick
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setTotal((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  // completion
  useEffect(() => {
    if (running && total >= totalTarget && !doneRef.current) {
      doneRef.current = true
      setRunning(false)
      log({ technique: tech.name, rounds: target, seconds: totalTarget })
      if (soundEnabled) playChime('success')
      toast({ kind: 'success', title: 'Breathing complete 🌬️', description: `${target} rounds of ${tech.name}.` })
    }
  }, [running, total, totalTarget, tech.name, target, soundEnabled, log, toast])

  const pos = total % cycle
  const { idx, secLeft } = phaseAt(tech.phases, pos)
  const phase = tech.phases[idx]
  const round = Math.min(target, Math.floor(total / cycle) + (running || total > 0 ? 1 : 0))

  const scale = running ? scaleFor(tech.phases, idx) : MIN_SCALE
  const transDur = running && phase.kind !== 'hold' ? phase.secs : 0.4

  const reset = () => {
    setRunning(false)
    setTotal(0)
    doneRef.current = false
  }

  const toggle = () => {
    if (total >= totalTarget) reset()
    doneRef.current = false
    setRunning((r) => !r)
  }

  const pick = (t: Technique) => {
    if (t.id === tech.id) return
    reset()
    setTech(t)
  }

  const pickRounds = (n: number) => {
    reset()
    setTarget(n)
  }

  const today = dayKey()
  const todaySessions = logs.filter((l) => l.day === today).length
  const todayMinutes = Math.round(logs.filter((l) => l.day === today).reduce((s, l) => s + l.seconds, 0) / 60)

  return (
    <div className="space-y-6">
      <PageHeader title="Breathing" subtitle="Guided box-breathing to calm and refocus." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<Wind className="h-5 w-5 text-primary" />} value={todaySessions} label="Sessions today" />
        <StatCard icon={<Clock className="h-5 w-5 text-success" />} value={`${todayMinutes}m`} label="Minutes today" />
        <StatCard icon={<Wind className="h-5 w-5 text-muted-foreground" />} value={logs.length} label="All-time" />
        <StatCard icon={<Clock className="h-5 w-5 text-muted-foreground" />} value={`${cycle}s`} label="Per round" />
      </div>

      {/* Technique picker */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TECHNIQUES.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t)}
            className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              t.id === tech.id ? 'border-primary bg-accent text-accent-foreground shadow-glow' : 'border-border bg-card hover:bg-secondary'
            }`}
          >
            <p className="font-semibold">{t.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Breathing stage */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10">
          <div className="relative grid h-64 w-64 place-items-center sm:h-72 sm:w-72">
            {/* outer guide ring */}
            <div className="absolute inset-0 rounded-full border border-border/60" />
            {/* animated breathing orb */}
            <div
              className="h-56 w-56 rounded-full bg-gradient-to-br from-primary to-[hsl(210_90%_60%)] opacity-90 shadow-glow sm:h-64 sm:w-64"
              style={{
                transform: `scale(${scale})`,
                transitionProperty: 'transform',
                transitionTimingFunction: 'ease-in-out',
                transitionDuration: `${transDur}s`,
              }}
            />
            {/* centred, unscaled text */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-white">
              <div>
                <p className="text-lg font-medium opacity-90">{running || total > 0 ? PHASE_LABEL[phase.kind] : 'Ready'}</p>
                <p className="text-6xl font-bold tabular-nums">{running ? secLeft : tech.phases[0].secs}</p>
              </div>
            </div>
          </div>

          <Badge tone="muted">
            Round {Math.max(1, round)} / {target}
          </Badge>

          {/* Rounds selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rounds</span>
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => pickRounds(n)}
                className={`rounded-lg border px-3 py-1 text-sm ${
                  target === n ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-secondary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={toggle} className="w-32">
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? 'Pause' : total > 0 && total < totalTarget ? 'Resume' : 'Start'}
            </Button>
            <Button variant="outline" onClick={reset} disabled={total === 0 && !running}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        {icon}
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
