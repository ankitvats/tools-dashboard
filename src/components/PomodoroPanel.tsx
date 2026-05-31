import { Play, Pause, RotateCcw, SkipForward, Brain, Coffee, Sofa } from 'lucide-react'
import { Ring, Button, Badge } from '@/components/ui/primitives'
import { useTimer } from '@/store/timer'
import { useSettings } from '@/store/settings'
import type { SessionKind } from '@/lib/types'
import { formatClock } from '@/lib/utils'
import { ensureNotificationPermission } from '@/lib/notify'
import { completeCurrentSession } from '@/hooks/usePomodoroEngine'

const KINDS: { value: SessionKind; label: string; short: string; icon: typeof Brain; color: string }[] = [
  { value: 'focus', label: 'Focus', short: 'Focus', icon: Brain, color: 'text-primary' },
  { value: 'short', label: 'Short break', short: 'Short', icon: Coffee, color: 'text-[hsl(199_89%_55%)]' },
  { value: 'long', label: 'Long break', short: 'Long', icon: Sofa, color: 'text-success' },
]

export function PomodoroPanel({ compact = false }: { compact?: boolean }) {
  const { kind, status, remaining, total, setKind, start, pause, resume, reset } = useTimer()
  const { notificationsEnabled } = useSettings()

  const running = status === 'running'
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0
  const ringColor = kind === 'focus' ? 'text-primary' : kind === 'short' ? 'text-[hsl(199_89%_55%)]' : 'text-success'

  const onPlay = async () => {
    if (notificationsEnabled) await ensureNotificationPermission()
    status === 'paused' ? resume() : start()
  }

  const ringSize = compact ? 184 : 264
  const ringStroke = compact ? 13 : 16

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap justify-center gap-2">
        {KINDS.map((k) => (
          <button
            key={k.value}
            disabled={running}
            onClick={() => setKind(k.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-50 ${
              kind === k.value ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-secondary'
            }`}
          >
            <k.icon className={`h-4 w-4 ${k.color}`} />
            {compact ? k.short : k.label}
          </button>
        ))}
      </div>

      <Ring value={progress} size={ringSize} stroke={ringStroke} barClass={ringColor}>
        <div className="text-center">
          <p className={`font-bold tabular-nums tracking-tight ${compact ? 'text-5xl' : 'text-6xl'}`}>{formatClock(remaining)}</p>
          <Badge tone="muted" className="mt-2">
            {running ? 'In progress' : status === 'paused' ? 'Paused' : 'Ready'}
          </Badge>
        </div>
      </Ring>

      <div className="flex items-center gap-3">
        <Button size="icon" variant="outline" onClick={reset} aria-label="Reset">
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button size="lg" className="w-40" onClick={() => (running ? pause() : onPlay())}>
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          {running ? 'Pause' : status === 'paused' ? 'Resume' : 'Start'}
        </Button>
        <Button size="icon" variant="outline" onClick={() => completeCurrentSession()} aria-label="Skip">
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
