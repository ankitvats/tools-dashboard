import React, { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckSquare, Timer, Droplets, Activity, CalendarCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Input, Label } from '@/components/ui/primitives'
import { Tabs } from '@/components/ui/tabs'
import { useTasks } from '@/store/tasks'
import { usePomodoro } from '@/store/pomodoro'
import { useWater } from '@/store/water'
import { useStretch } from '@/store/stretch'
import { useAppointments } from '@/store/appointments'
import { lastNDays, dayKey } from '@/lib/utils'

type Range = '7' | '30' | 'custom'

function daysInRange(from: string, to: string): string[] {
  const out: string[] = []
  const cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (cur <= end) {
    out.push(dayKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export default function Insights() {
  const tasks = useTasks((s) => s.tasks)
  const sessions = usePomodoro((s) => s.sessions)
  const water = useWater((s) => s.entries)
  const stretch = useStretch((s) => s.logs)
  const appts = useAppointments((s) => s.appointments)
  const [range, setRange] = useState<Range>('7')
  const today = dayKey()
  const [customFrom, setCustomFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 13); return dayKey(d) })
  const [customTo, setCustomTo] = useState(today)

  const days = useMemo(() => {
    if (range === 'custom') return customFrom && customTo && customFrom <= customTo ? daysInRange(customFrom, customTo) : []
    return lastNDays(Number(range))
  }, [range, customFrom, customTo])

  const series = useMemo(
    () =>
      days.map((d) => {
        const dt = new Date(d + 'T00:00:00')
        return {
          day: d,
          label:
            range === '7'
              ? dt.toLocaleDateString(undefined, { weekday: 'short' })
              : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          tasks: tasks.filter((t) => t.completed && t.completedAt?.slice(0, 10) === d).length,
          focusHours: +(sessions.filter((s) => s.day === d && s.kind === 'focus').reduce((a, s) => a + s.durationSec, 0) / 3600).toFixed(2),
          water: water.filter((w) => w.day === d).reduce((a, w) => a + w.amountMl, 0),
          stretches: stretch.filter((s) => s.day === d).length,
        }
      }),
    [days, range, tasks, sessions, water, stretch],
  )

  const totals = useMemo(() => {
    const tasksDone = series.reduce((a, d) => a + d.tasks, 0)
    const focusHours = +series.reduce((a, d) => a + d.focusHours, 0).toFixed(1)
    const waterMl = series.reduce((a, d) => a + d.water, 0)
    const stretches = series.reduce((a, d) => a + d.stretches, 0)
    const start = new Date(days[0] + 'T00:00:00').getTime()
    const past = appts.filter((a) => {
      const t = new Date(a.start).getTime()
      return t >= start && t <= Date.now()
    })
    return { tasksDone, focusHours, waterMl, stretches, apptsAttended: past.length }
  }, [series, days, appts])

  // priority distribution for pie
  const priorityData = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 }
    tasks.forEach((t) => (counts[t.priority] += 1))
    return [
      { name: 'High', value: counts.high, color: 'hsl(0 80% 60%)' },
      { name: 'Medium', value: counts.medium, color: 'hsl(38 92% 50%)' },
      { name: 'Low', value: counts.low, color: 'hsl(240 6% 55%)' },
    ].filter((d) => d.value > 0)
  }, [tasks])

  return (
    <div className="space-y-6">
      <PageHeader title="Productivity Insights" subtitle="Trends across focus, tasks, hydration and movement." />

      <div className="flex flex-wrap items-end gap-4">
        <Tabs
          value={range}
          onChange={(v) => setRange(v as Range)}
          tabs={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: 'custom', label: 'Custom range' },
          ]}
        />
        {range === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 pb-0.5">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={customTo} min={customFrom} max={today} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-36 text-sm" />
            </div>
            {days.length > 0 && (
              <p className="pb-1 text-xs text-muted-foreground">{days.length} days</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric icon={CheckSquare} label="Tasks done" value={`${totals.tasksDone}`} tint="text-primary" />
        <Metric icon={Timer} label="Focus hours" value={`${totals.focusHours}h`} tint="text-[hsl(210_90%_60%)]" />
        <Metric icon={Droplets} label="Water" value={`${(totals.waterMl / 1000).toFixed(1)}L`} tint="text-[hsl(199_89%_55%)]" />
        <Metric icon={Activity} label="Stretches" value={`${totals.stretches}`} tint="text-success" />
        <Metric icon={CalendarCheck} label="Meetings" value={`${totals.apptsAttended}`} tint="text-warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Focus hours">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(256 90% 67%)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(256 90% 67%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip content={<ChartTip suffix="h" />} />
              <Area type="monotone" dataKey="focusHours" stroke="hsl(256 90% 67%)" strokeWidth={2.5} fill="url(#focusGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasks completed">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
              <Bar dataKey="tasks" fill="hsl(152 62% 42%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Water intake (ml)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip content={<ChartTip suffix=" ml" />} cursor={{ fill: 'hsl(var(--secondary))' }} />
              <Bar dataKey="water" fill="hsl(199 89% 55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stretch sessions">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
              <Tooltip content={<ChartTip />} />
              <Line type="monotone" dataKey="stretches" stroke="hsl(38 92% 50%)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {priorityData.length > 0 && (
        <ChartCard title="Task priority distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={92} paddingAngle={3}>
                {priorityData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-4">
            {priorityData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value, tint }: { icon: typeof CheckSquare; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={`h-5 w-5 ${tint}`} />
        <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ChartTip({ active, payload, label, suffix = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-glow">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="tabular-nums" style={{ color: p.color || p.fill }}>
          {p.value}
          {suffix}
        </p>
      ))}
    </div>
  )
}
