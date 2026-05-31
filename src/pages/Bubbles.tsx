import { useCallback, useMemo, useRef, useState } from 'react'
import { Sparkles, RefreshCw, Hand, Flame, Star } from 'lucide-react'
import { Card, CardContent, Button, PageHeader } from '@/components/ui/primitives'
import { useBubbles } from '@/store/bubbles'
import { useSettings } from '@/store/settings'
import { playPop } from '@/lib/notify'

const COUNT = 120 // divisible by 6 / 10 / 12 columns → clean rows
const COMBO_WINDOW = 1500 // ms to keep a streak alive
const SPECIALS = 5 // golden bubbles per sheet

interface Burst {
  id: number
  x: number
  y: number
  hue: number
  special: boolean
  label: string
  parts: { tx: number; ty: number }[]
}

function makeParts() {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5
    const d = 26 + Math.random() * 18
    return { tx: Math.cos(a) * d, ty: Math.sin(a) * d }
  })
}

export default function Bubbles() {
  const { total, today, bestCombo, pop, reportCombo } = useBubbles()
  const { soundEnabled } = useSettings()

  const [popped, setPopped] = useState<boolean[]>(() => Array(COUNT).fill(false))
  const [sheet, setSheet] = useState(0)
  const [bursts, setBursts] = useState<Burst[]>([])
  const [combo, setCombo] = useState(0)

  const poppedCount = useRef(0)
  const poppedRef = useRef<boolean[]>(Array(COUNT).fill(false))
  const dragging = useRef(false)
  const comboRef = useRef(0)
  const lastPop = useRef(0)
  const comboTimer = useRef<number | null>(null)
  const burstId = useRef(0)
  const gridRef = useRef<HTMLDivElement>(null)

  // per-sheet colors + golden bubbles
  const hues = useMemo(() => Array.from({ length: COUNT }, (_, i) => (i * 37 + sheet * 53) % 360), [sheet])
  const specials = useMemo(() => {
    const s = new Set<number>()
    while (s.size < SPECIALS) s.add(Math.floor(Math.random() * COUNT))
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet])

  const refill = useCallback(() => {
    window.setTimeout(() => {
      poppedRef.current = Array(COUNT).fill(false)
      poppedCount.current = 0
      setPopped(Array(COUNT).fill(false))
      setSheet((s) => s + 1)
    }, 450)
  }, [])

  const popOne = useCallback(
    (idx: number, clientX: number, clientY: number) => {
      // synchronous dedupe — must not depend on the async setPopped updater
      if (poppedRef.current[idx]) return
      poppedRef.current[idx] = true
      poppedCount.current += 1
      setPopped((prev) => {
        const next = [...prev]
        next[idx] = true
        return next
      })
      if (poppedCount.current >= COUNT) refill()

      const special = specials.has(idx)

      // combo bookkeeping
      const now = performance.now()
      comboRef.current = now - lastPop.current < COMBO_WINDOW ? comboRef.current + 1 : 1
      lastPop.current = now
      const c = comboRef.current
      setCombo(c)
      reportCombo(c)
      if (comboTimer.current) window.clearTimeout(comboTimer.current)
      comboTimer.current = window.setTimeout(() => {
        comboRef.current = 0
        setCombo(0)
      }, COMBO_WINDOW)

      pop()
      if (soundEnabled) playPop(c, special)
      navigator.vibrate?.(special ? 22 : Math.min(6 + c, 18))

      // spawn burst
      const rect = gridRef.current?.getBoundingClientRect()
      if (rect) {
        const id = burstId.current++
        const label = special ? '★' : c >= 3 ? `x${c}` : ''
        const b: Burst = {
          id,
          x: clientX - rect.left,
          y: clientY - rect.top,
          hue: special ? 45 : hues[idx],
          special,
          label,
          parts: makeParts(),
        }
        setBursts((prev) => [...prev, b])
        window.setTimeout(() => setBursts((prev) => prev.filter((x) => x.id !== id)), 650)
      }
    },
    [pop, soundEnabled, refill, specials, hues, reportCombo],
  )

  const newSheet = () => {
    poppedRef.current = Array(COUNT).fill(false)
    poppedCount.current = 0
    setPopped(Array(COUNT).fill(false))
    setSheet((s) => s + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bubble Wrap" subtitle="Pop away the stress. It never runs out." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<Hand className="h-5 w-5 text-primary" />} value={today} label="Popped today" />
        <StatCard icon={<Sparkles className="h-5 w-5 text-success" />} value={total.toLocaleString()} label="All-time pops" />
        <StatCard icon={<Flame className="h-5 w-5 text-warning" />} value={`x${bestCombo}`} label="Best combo" />
        <Card>
          <CardContent className="flex h-full flex-col justify-between p-4">
            <Star className="h-5 w-5 text-warning" />
            <Button variant="outline" className="mt-2 w-full" onClick={newSheet}>
              <RefreshCw className="h-4 w-4" /> New sheet
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent
          className="relative p-4 sm:p-6"
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          {/* live combo badge */}
          {combo >= 2 && (
            <div
              key={combo}
              className="fx-combo pointer-events-none absolute right-5 top-3 z-10 flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 text-sm font-bold text-warning"
            >
              <Flame className="h-4 w-4" /> x{combo}
            </div>
          )}

          <div ref={gridRef} className="relative mx-auto max-w-3xl">
            <div
              key={sheet}
              className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 sm:gap-2 lg:grid-cols-12"
              style={{ touchAction: 'manipulation' }}
            >
              {popped.map((isPopped, idx) => {
                const special = specials.has(idx)
                const h = hues[idx]
                return (
                  <button
                    key={idx}
                    aria-label={isPopped ? 'popped' : 'pop bubble'}
                    onPointerDown={(e) => {
                      dragging.current = true
                      popOne(idx, e.clientX, e.clientY)
                    }}
                    onPointerEnter={(e) => {
                      if (dragging.current) popOne(idx, e.clientX, e.clientY)
                    }}
                    className={`relative aspect-square rounded-full transition-all duration-150 focus:outline-none ${
                      isPopped ? 'scale-90 bg-secondary shadow-[inset_0_2px_6px_rgba(0,0,0,0.28)]' : 'active:scale-95'
                    }`}
                    style={
                      isPopped
                        ? undefined
                        : {
                            backgroundImage: special
                              ? 'radial-gradient(circle at 30% 25%, #fff6c2, #f6c64b 55%, #d99417)'
                              : `radial-gradient(circle at 30% 25%, hsl(${h} 95% 80%), hsl(${h} 80% 58%) 60%, hsl(${h} 75% 46%))`,
                            boxShadow: special ? '0 2px 10px hsl(45 90% 50% / 0.5)' : `0 2px 6px hsl(${h} 60% 45% / 0.35)`,
                          }
                    }
                  >
                    {!isPopped && (
                      <span className="pointer-events-none absolute left-[22%] top-[16%] h-1/4 w-1/4 rounded-full bg-white/70 blur-[1px]" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* FX overlay */}
            <div className="pointer-events-none absolute inset-0 overflow-visible">
              {bursts.map((b) => (
                <div key={b.id} className="absolute" style={{ left: b.x, top: b.y }}>
                  <span
                    className="fx-ring absolute -left-3 -top-3 h-6 w-6 rounded-full border-2"
                    style={{ borderColor: `hsl(${b.hue} 90% 60%)` }}
                  />
                  {b.parts.map((p, i) => (
                    <span
                      key={i}
                      className="fx-particle absolute h-1.5 w-1.5 rounded-full"
                      style={
                        {
                          backgroundColor: `hsl(${b.hue} 90% ${b.special ? 60 : 58}%)`,
                          ['--tx' as any]: `${p.tx}px`,
                          ['--ty' as any]: `${p.ty}px`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                  {b.label && (
                    <span
                      className="fx-float absolute -top-2 left-0 whitespace-nowrap text-sm font-extrabold"
                      style={{ color: b.special ? 'hsl(45 90% 45%)' : `hsl(${b.hue} 80% 45%)` }}
                    >
                      {b.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
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
