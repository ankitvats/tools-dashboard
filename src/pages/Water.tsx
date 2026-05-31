import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Undo2, Droplets, BellOff, Bell } from 'lucide-react'
import { Card, CardContent, Button, Input, Badge, Switch, Label, PageHeader } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useWater } from '@/store/water'
import { useSettings } from '@/store/settings'
import { dayKey, pct } from '@/lib/utils'

const QUICK = [250, 500, 750]

export default function Water() {
  const { entries, add, undoLast } = useWater()
  const { waterGoalMl, waterReminderEnabled, waterReminderMin, set } = useSettings()
  const { toast } = useToast()
  const [custom, setCustom] = useState('')

  const today = dayKey()
  const todays = entries.filter((e) => e.day === today)
  const total = todays.reduce((a, e) => a + e.amountMl, 0)
  const percent = pct(total, waterGoalMl)
  const remaining = Math.max(0, waterGoalMl - total)
  const done = total >= waterGoalMl

  const addWater = (ml: number) => {
    if (ml <= 0) return
    add(ml)
    if (total + ml >= waterGoalMl && total < waterGoalMl) {
      toast({ kind: 'success', title: '🎉 Goal reached!', description: 'You hit your hydration goal today.' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Water" subtitle="Stay hydrated, stay sharp." />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Animated bottle */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <div className="relative h-56 w-36 overflow-hidden rounded-[2rem] border-4 border-[hsl(199_89%_55%)]/30 bg-[hsl(199_89%_55%)]/5">
              <motion.div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(199_89%_45%)] to-[hsl(199_89%_60%)]"
                initial={false}
                animate={{ height: `${percent}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              >
                <div className="absolute inset-x-0 top-0 h-3 animate-pulse bg-white/30" />
              </motion.div>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-3xl font-bold tabular-nums drop-shadow">{percent}%</p>
                  {done && <span className="text-2xl">🏆</span>}
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{total} ml</p>
              <p className="text-sm text-muted-foreground">of {waterGoalMl} ml · {remaining} ml to go</p>
            </div>
            {done && <Badge tone="success">Goal complete — great job! 💧</Badge>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Quick add */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold">Quick add</h3>
              <div className="grid grid-cols-3 gap-3">
                {QUICK.map((ml) => (
                  <button
                    key={ml}
                    onClick={() => addWater(ml)}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-border bg-card py-4 transition-all hover:-translate-y-0.5 hover:border-[hsl(199_89%_55%)] hover:shadow-soft"
                  >
                    <Droplets className="h-6 w-6 text-[hsl(199_89%_55%)] transition-transform group-hover:scale-110" />
                    <span className="text-sm font-semibold">{ml} ml</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Custom amount (ml)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && custom) { addWater(Number(custom)); setCustom('') }
                  }}
                />
                <Button onClick={() => { if (custom) { addWater(Number(custom)); setCustom('') } }}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
                <Button variant="outline" onClick={undoLast} disabled={todays.length === 0} aria-label="Undo">
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reminder controls */}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                {waterReminderEnabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <Label>Hydration reminders</Label>
                  <p className="text-xs text-muted-foreground">Every {waterReminderMin} min while the app is open</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={waterReminderEnabled} onCheckedChange={(v) => set('waterReminderEnabled', v)} />
              </div>
            </CardContent>
          </Card>
          {waterReminderEnabled && (
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  onClick={() => set('waterReminderMin', m)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${waterReminderMin === m ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-secondary'}`}
                >
                  {m} min
                </button>
              ))}
              <button
                onClick={() => { set('waterReminderEnabled', false); toast({ kind: 'info', title: 'Reminders paused' }) }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
              >
                Snooze / pause
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Today log */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold">Today's log</h3>
          {todays.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No water logged yet. Tap a quick-add button above.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {todays.map((e) => (
                <li key={e.id} className="rounded-lg bg-secondary px-3 py-1.5 text-sm">
                  <span className="font-medium">{e.amountMl} ml</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(e.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
