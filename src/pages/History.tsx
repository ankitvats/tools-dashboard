import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Droplets,
  Timer,
  Activity,
  Wind,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui/primitives";
import { useTasks } from "@/store/tasks";
import { usePomodoro } from "@/store/pomodoro";
import { useWater } from "@/store/water";
import { useStretch } from "@/store/stretch";
import { useBreathing } from "@/store/breathing";
import { useAppointments } from "@/store/appointments";
import { useSettings } from "@/store/settings";
import { STRETCHES } from "@/lib/data";
import { cn, dayKey } from "@/lib/utils";

function addDays(dateKey: string, n: number): string {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function History() {
  const today = dayKey();
  const [selected, setSelected] = useState(today);

  const tasks = useTasks((s) => s.tasks);
  const completions = useTasks((s) => s.completions);
  const sessions = usePomodoro((s) => s.sessions);
  const water = useWater((s) => s.entries);
  const stretch = useStretch((s) => s.logs);
  const breathing = useBreathing((s) => s.logs);
  const appointments = useAppointments((s) => s.appointments);
  const waterGoalMl = useSettings((s) => s.waterGoalMl);

  const stretchById = useMemo(
    () => Object.fromEntries(STRETCHES.map((s) => [s.id, s])),
    [],
  );

  const dayTasks = useMemo(() => {
    const oneOff = tasks.filter(
      (t) =>
        t.repeat !== "daily" &&
        t.completed &&
        t.completedAt?.slice(0, 10) === selected,
    );
    const tasksById = new Map(tasks.map((t) => [t.id, t]));
    const daily = completions
      .filter((c) => c.day === selected)
      .map((c) => {
        const t = tasksById.get(c.taskId);
        return t ? { ...t, completedAt: c.completedAt } : null;
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
    return [...oneOff, ...daily];
  }, [tasks, completions, selected]);
  const dayFocus = useMemo(
    () => sessions.filter((s) => s.day === selected && s.kind === "focus"),
    [sessions, selected],
  );
  const dayBreaks = useMemo(
    () => sessions.filter((s) => s.day === selected && s.kind !== "focus"),
    [sessions, selected],
  );
  const dayWater = useMemo(
    () => water.filter((w) => w.day === selected),
    [water, selected],
  );
  const dayStretch = useMemo(
    () => stretch.filter((s) => s.day === selected),
    [stretch, selected],
  );
  const dayBreathing = useMemo(
    () => breathing.filter((b) => b.day === selected),
    [breathing, selected],
  );
  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.start.slice(0, 10) === selected)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [appointments, selected],
  );

  const totalFocusMin = Math.round(
    dayFocus.reduce((a, s) => a + s.durationSec, 0) / 60,
  );
  const totalWaterMl = dayWater.reduce((a, w) => a + w.amountMl, 0);
  const waterPct =
    waterGoalMl > 0
      ? Math.min(100, Math.round((totalWaterMl / waterGoalMl) * 100))
      : 0;

  const isToday = selected === today;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily History"
        subtitle="Review what you accomplished on any past day."
      />

      {/* Date navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelected(addDays(selected, -1))}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border transition-colors hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 justify-center">
          <input
            type="date"
            value={selected}
            max={today}
            onChange={(e) => e.target.value && setSelected(e.target.value)}
            className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setSelected(addDays(selected, 1))}
          disabled={isToday}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelected(today)}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
          >
            Today
          </button>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryMetric
          icon={CheckSquare}
          label="Tasks done"
          value={String(dayTasks.length)}
          tint="text-primary"
        />
        <SummaryMetric
          icon={Timer}
          label="Focus time"
          value={`${totalFocusMin}m`}
          tint="text-[hsl(210_90%_60%)]"
        />
        <SummaryMetric
          icon={Droplets}
          label="Water"
          value={`${(totalWaterMl / 1000).toFixed(1)}L`}
          tint="text-[hsl(199_89%_55%)]"
        />
        <SummaryMetric
          icon={Activity}
          label="Stretches"
          value={String(dayStretch.length)}
          tint="text-success"
        />
        <SummaryMetric
          icon={Wind}
          label="Breathing"
          value={String(dayBreathing.length)}
          tint="text-[hsl(280_70%_60%)]"
        />
        <SummaryMetric
          icon={CalendarDays}
          label="Meetings"
          value={String(dayAppointments.length)}
          tint="text-warning"
        />
      </div>

      {/* Detail cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4 text-primary" />
              Tasks Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tasks completed.
              </p>
            ) : (
              <ul className="space-y-2">
                {dayTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase min-w-[53px] text-center",
                        t.priority === "high" &&
                          "bg-destructive/15 text-destructive",
                        t.priority === "medium" && "bg-warning/15 text-warning",
                        t.priority === "low" &&
                          "bg-secondary text-muted-foreground",
                      )}
                    >
                      {t.priority}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {t.title}
                      </p>
                      {t.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatTime(t.completedAt)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pomodoro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-[hsl(210_90%_60%)]" />
              Focus Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayFocus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No focus sessions.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {dayFocus.length}
                    </p>
                    <p className="text-xs text-muted-foreground">sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {totalFocusMin}m
                    </p>
                    <p className="text-xs text-muted-foreground">focused</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {dayBreaks.length}
                    </p>
                    <p className="text-xs text-muted-foreground">breaks</p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {dayFocus.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>Focus · {Math.round(s.durationSec / 60)}m</span>
                      <span>{formatTime(s.completedAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Water */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4 text-[hsl(199_89%_55%)]" />
              Water Intake
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayWater.length === 0 ? (
              <p className="text-sm text-muted-foreground">No water logged.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{totalWaterMl} ml</span>
                    <span className="text-muted-foreground">
                      goal {waterGoalMl} ml · {waterPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-[hsl(199_89%_55%)] transition-all"
                      style={{ width: `${waterPct}%` }}
                    />
                  </div>
                </div>
                <ul className="space-y-1">
                  {dayWater.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>{w.amountMl} ml</span>
                      <span>{formatTime(w.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stretch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-success" />
              Stretch Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayStretch.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stretches logged.
              </p>
            ) : (
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {dayStretch.length}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  stretch sessions
                </p>
                <ul className="space-y-1">
                  {dayStretch.map((s) => {
                    const info = stretchById[s.stretchId];
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>
                          {info ? `${info.icon} ${info.name}` : s.stretchId}
                        </span>
                        <span>{formatTime(s.at)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breathing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wind className="h-4 w-4 text-[hsl(280_70%_60%)]" />
              Breathing Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayBreathing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No breathing sessions.
              </p>
            ) : (
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {dayBreathing.length}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  sessions ·{" "}
                  {Math.round(
                    dayBreathing.reduce((a, b) => a + b.seconds, 0) / 60,
                  )}{" "}
                  min total
                </p>
                <ul className="space-y-1">
                  {dayBreathing.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>
                        {b.technique} · {b.rounds} rounds
                      </span>
                      <span>{formatTime(b.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-warning" />
              Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No meetings scheduled.
              </p>
            ) : (
              <ul className="space-y-2">
                {dayAppointments.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(a.start)}
                        {a.durationMin ? ` · ${a.durationMin} min` : ""}
                        {a.location ? ` · ${a.location}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof CheckSquare;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={`h-5 w-5 ${tint}`} />
        <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
