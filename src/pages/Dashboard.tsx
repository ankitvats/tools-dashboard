import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Droplets,
  ArrowRight,
  Plus,
  GlassWater,
  RefreshCw,
  BookOpen,
  Volume2,
  Quote as QuoteIcon,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Mic,
  MicOff,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  Heart,
  Bookmark,
  BookmarkCheck,
  Smile,
  FlaskConical,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  Progress,
  Button,
  Input,
  Ring,
} from "@/components/ui/primitives";
import { useStats } from "@/hooks/useStats";
import { useNow, greeting } from "@/hooks/useNow";
import { useSettings } from "@/store/settings";
import { useTasks } from "@/store/tasks";
import { useWater } from "@/store/water";
import { usePomodoro } from "@/store/pomodoro";
import { useTimer } from "@/store/timer";
import { useToast } from "@/components/ui/toast";
import { useDailyQuote } from "@/hooks/useDailyQuote";
import { fetchRandomQuote, type ApiQuote } from "@/lib/quotes";
import {
  fetchRandomWord,
  getDailyWord,
  type WordEntry,
} from "@/lib/dictionary";
import { getDailyDose, fetchDose, type Dose } from "@/lib/dose";
import { AFFIRMATIONS } from "@/lib/affirmations";
import { useVocabulary } from "@/store/vocabulary";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { isTaskDone, isToday } from "@/lib/tasks";
import { dayKey, pct, cn, formatClock } from "@/lib/utils";
import type { SessionKind } from "@/lib/types";
import { ensureNotificationPermission } from "@/lib/notify";

// ── Constants ────────────────────────────────────────────────

const CLOCKS = [
  { city: "India", tz: "Asia/Kolkata", flag: "🇮🇳" },
  { city: "US West", tz: "America/Los_Angeles", flag: "🇺🇸" },
  { city: "Poland", tz: "Europe/Warsaw", flag: "🇵🇱" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Work: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Personal: "bg-accent text-accent-foreground",
  Health:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

// ── Helpers ──────────────────────────────────────────────────

function dueMeta(key?: string) {
  if (!key) return null;
  const today = dayKey();
  const tomorrow = dayKey(new Date(Date.now() + 864e5));
  const label =
    key === today
      ? "Today"
      : key === tomorrow
        ? "Tmrw"
        : new Date(key + "T00:00:00").toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
  return { label, overdue: key < today, isToday: key === today };
}

function dueBucket(key?: string): number {
  if (!key) return 3;
  const today = dayKey();
  if (key === today) return 0;
  return key > today ? 1 : 2;
}

function getDailyIndex(max: number) {
  const seed = parseInt(dayKey().replace(/-/g, ""), 10);
  return seed % max;
}

function synthSpeak(word: string) {
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  }
}

// ── World Clocks ─────────────────────────────────────────────

function WorldClocks({ now }: { now: Date }) {
  return (
    <div className="hidden gap-2 sm:flex">
      {CLOCKS.map((c) => {
        const time = now.toLocaleTimeString("en-US", {
          timeZone: c.tz,
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const day = now.toLocaleString("en-US", {
          timeZone: c.tz,
          day: "numeric",
        });
        const weekday = now.toLocaleString("en-US", {
          timeZone: c.tz,
          weekday: "short",
        });
        return (
          <div
            key={c.city}
            className="flex flex-col items-center rounded-xl border border-border bg-card px-3.5 py-2 shadow-card-subtle"
          >
            <span className="font-mono text-sm font-bold tabular-nums">
              {time}
            </span>
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              {c.flag} {c.city} · {day} {weekday}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Zone 1: Today's tasks ────────────────────────────────────

function TodayTasksCard() {
  const tasks = useTasks((s) => s.tasks);
  const toggleTask = useTasks((s) => s.toggle);
  const [tab, setTab] = useState<"today" | "upcoming">("today");

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const da = isTaskDone(a),
          db = isTaskDone(b);
        if (da !== db) return da ? 1 : -1;
        const ba = a.repeat === "daily" ? 0 : dueBucket(a.dueDate);
        const bb = b.repeat === "daily" ? 0 : dueBucket(b.dueDate);
        if (ba !== bb) return ba - bb;
        if (ba === 1) return a.dueDate! < b.dueDate! ? -1 : 1;
        if (ba === 2) return a.dueDate! > b.dueDate! ? -1 : 1;
        return a.order - b.order;
      }),
    [tasks],
  );

  const todayItems = useMemo(() => sorted.filter((t) => isToday(t)), [sorted]);
  const upcomingItems = useMemo(
    () =>
      sorted.filter(
        (t) => !isToday(t) && t.repeat !== "daily" && (!t.dueDate || t.dueDate > dayKey()),
      ),
    [sorted],
  );
  const visible = tab === "today" ? todayItems : upcomingItems;

  const doneCount = todayItems.filter((t) => isTaskDone(t)).length;
  const totalCount = todayItems.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Today's tasks</h3>
          <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5 text-xs font-medium">
            {[
              { value: "today" as const, label: "Today" },
              { value: "upcoming" as const, label: "Upcoming" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  tab === t.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className=" shrink-0 font-mono text-xs text-muted-foreground">
              {doneCount}/{totalCount} done
            </span>
            <Link
              to="/tasks"
              className="ml-2 shrink-0 font-mono text-xs text-muted-foreground flex items-center gap-0.5 transition-colors hover:text-foreground"
            >
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <Progress className="mt-3 h-1" value={pct(doneCount, totalCount)} />
        )}

        {/* All-done banner */}
        {allDone && tab === "today" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">
              All done for today — great work!
            </span>
          </div>
        )}

        {/* Task list */}
        <div className="mt-3 flex-1 overflow-y-auto pr-1 max-h-56">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {tab === "today"
                  ? "No tasks for today yet."
                  : "Nothing upcoming."}
              </p>
              {tab === "today" && (
                <span className="text-xs text-muted-foreground/70">
                  Add your first task below ↓
                </span>
              )}
            </div>
          ) : (
            <ul className="space-y-0.5 grid max-w-full">
              {visible.map((t) => {
                const done = isTaskDone(t);
                const due =
                  t.repeat === "daily"
                    ? { label: "Daily", overdue: false, isToday: true }
                    : dueMeta(t.dueDate);
                const catColor = t.category
                  ? (CATEGORY_COLORS[t.category] ??
                    "bg-secondary text-muted-foreground")
                  : null;
                return (
                  <li key={t.id} className="min-w-0">
                    <button
                      onClick={() => toggleTask(t.id)}
                      className="flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left text-sm hover:bg-secondary transition-colors truncate"
                    >
                      <span
                        className={cn(
                          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 transition-colors",
                          done
                            ? "border-primary bg-primary text-white"
                            : "border-border",
                        )}
                      >
                        {done && (
                          <span className="text-[9px] leading-none">✓</span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "flex-1 truncate",
                          done && "text-muted-foreground line-through",
                        )}
                      >
                        {t.title}
                      </span>
                      {/* category tag — fixed 80px */}
                      <span className="flex w-20 shrink-0 justify-end">
                        {catColor && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              catColor,
                            )}
                          >
                            {t.category}
                          </span>
                        )}
                      </span>
                      {/* due time — fixed 42px */}
                      <span
                        className={cn(
                          "w-[42px] shrink-0 text-right font-mono text-xs",
                          done
                            ? "text-muted-foreground"
                            : due?.overdue
                              ? "text-destructive"
                              : due?.isToday
                                ? "text-primary"
                                : "text-muted-foreground",
                        )}
                      >
                        {due?.label ?? ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Quick add */}
        <QuickTaskAdd />
      </CardContent>
    </Card>
  );
}

function QuickTaskAdd() {
  const add = useTasks((s) => s.add);
  const { toast } = useToast();
  const [title, setTitle] = useState("");

  const addTask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    add({
      title: t.charAt(0).toUpperCase() + t.slice(1),
      priority: "medium",
      dueDate: dayKey(),
    });
    toast({ kind: "success", title: "Task added for today" });
  };
  const submit = () => {
    addTask(title);
    setTitle("");
  };

  const { supported, listening, start, stop } = useSpeechRecognition({
    onResult: (transcript) => addTask(transcript),
  });

  return (
    <div className="mt-3 flex gap-2">
      <div className="relative flex-1">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={
            listening ? "Listening… say your task" : "Add a task for today…"
          }
          className="h-9 pr-10"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1 py-0.5 text-[10px] text-muted-foreground">
          ↵
        </kbd>
      </div>
      {supported && (
        <Button
          size="sm"
          variant={listening ? "destructive" : "outline"}
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => (listening ? stop() : start())}
          aria-label={listening ? "Stop listening" : "Add by voice"}
        >
          {listening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}
      <Button
        size="sm"
        className="h-9"
        onClick={submit}
        disabled={!title.trim()}
      >
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  );
}

// ── Zone 1: Focus timer (light card) ────────────────────────

const TIMER_KINDS: { value: SessionKind; label: string; short: string }[] = [
  { value: "focus", label: "Focus", short: "Focus" },
  { value: "short", label: "Short break", short: "Short" },
  { value: "long", label: "Long break", short: "Long" },
];

function FocusCard() {
  const {
    kind,
    status,
    remaining,
    total,
    setKind,
    start,
    pause,
    resume,
    reset,
  } = useTimer();
  const sessions = usePomodoro((s) => s.sessions);
  const { notificationsEnabled } = useSettings();

  const running = status === "running";
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

  const today = dayKey();
  const todayFocus = useMemo(
    () => sessions.filter((s) => s.day === today && s.kind === "focus"),
    [sessions, today],
  );
  const todayMin = Math.round(
    todayFocus.reduce((a, s) => a + s.durationSec, 0) / 60,
  );

  const onPlay = async () => {
    if (notificationsEnabled) await ensureNotificationPermission();
    status === "paused" ? resume() : start();
  };

  const statusLabel = running
    ? "In progress"
    : status === "paused"
      ? "Paused"
      : "Ready";

  return (
    <Card>
      <CardContent className="flex flex-col p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Focus Timer</h3>
          <Link
            to="/pomodoro"
            className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Full view <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Kind tabs */}
        <div className="mt-3 flex rounded-lg border border-border bg-secondary/50 p-0.5">
          {TIMER_KINDS.map((k) => (
            <button
              key={k.value}
              disabled={running}
              onClick={() => setKind(k.value)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                kind === k.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k.short}
            </button>
          ))}
        </div>

        {/* Dial */}
        <div className="my-4 flex justify-center">
          <Ring
            value={progress}
            size={160}
            stroke={10}
            trackClass="text-border"
            barClass="text-primary"
          >
            <div className="text-center">
              <p className="font-mono text-4xl font-bold tabular-nums tracking-tight">
                {formatClock(remaining)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {statusLabel}
              </p>
            </div>
          </Ring>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => (running ? pause() : onPlay())}
            className="flex h-10 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {running ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? "Pause" : status === "paused" ? "Resume" : "Start"}
          </button>
          <button
            onClick={() => {
              const { kind } = useTimer.getState()
              const { sessionsBeforeLongBreak, autoStartNext } = useSettings.getState()
              const { completedFocusCount } = usePomodoro.getState()
              const next: SessionKind =
                kind === 'focus'
                  ? (completedFocusCount + 1) % sessionsBeforeLongBreak === 0
                    ? 'long'
                    : 'short'
                  : 'focus'
              useTimer.getState().advance(next)
              if (autoStartNext) useTimer.getState().start()
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Skip"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Stats footer */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {todayFocus.length} sessions today · {todayMin} min focused
        </p>
      </CardContent>
    </Card>
  );
}

// ── Zone 2: Hydration ────────────────────────────────────────

function HydrationCard() {
  const entries = useWater((s) => s.entries);
  const add = useWater((s) => s.add);
  const goal = useSettings((s) => s.waterGoalMl);
  const { toast } = useToast();

  const today = useMemo(
    () =>
      entries
        .filter((e) => e.day === dayKey())
        .reduce((a, e) => a + e.amountMl, 0),
    [entries],
  );
  const remaining = Math.max(0, goal - today);

  const log = (ml: number) => {
    add(ml);
    if (today < goal && today + ml >= goal)
      toast({ kind: "success", title: "🎉 Hydration goal reached!" });
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(199_89%_55%)]/15 text-[hsl(199_89%_55%)]">
              <Droplets className="h-4 w-4" />
            </span>
            <h3 className="font-semibold">Hydration</h3>
          </div>
          <Link
            to="/water"
            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            Open <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-mono text-3xl font-bold tabular-nums">
            {today}
          </span>
          <span className="text-sm text-muted-foreground">/ {goal} ml</span>
        </div>
        <Progress
          className="mt-2 h-1.5"
          value={pct(today, goal)}
          indicatorClass="bg-[hsl(199_89%_55%)]"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {remaining} ml to go
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { ml: 200, label: "+1 glass", sub: "200 ml" },
            { ml: 500, label: "+1 bottle", sub: "500 ml" },
          ].map(({ ml, label, sub }) => (
            <button
              key={ml}
              onClick={() => log(ml)}
              className="group flex flex-col items-center gap-1 rounded-xl border border-border py-2.5 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:border-[hsl(199_89%_55%)] hover:shadow-soft active:scale-95"
            >
              <GlassWater className="h-4 w-4 text-[hsl(199_89%_55%)] transition-transform group-hover:scale-110" />
              <span>{label}</span>
              <span className="font-mono text-[10px] font-normal text-muted-foreground">
                {sub}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Zone 2: Up next ──────────────────────────────────────────

function UpNextCard() {
  const s = useStats();
  const now = Date.now();
  const next = s.upcoming.slice(0, 2);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Up next</h3>
          <Link
            to="/appointments"
            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            Schedule <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {next.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All clear — no upcoming appointments.
            </p>
          ) : (
            next.map((a) => {
              const d = new Date(a.start);
              const relMin = Math.round((d.getTime() - now) / 60000);
              const rel =
                relMin <= 0
                  ? "Now"
                  : relMin < 60
                    ? `in ${relMin} min`
                    : `in ${Math.round(relMin / 60)}h`;
              const time = d.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5"
                >
                  <div className="h-8 w-[3px] shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{time}</span> · {rel}
                    </p>
                  </div>
                  <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Zone 3: Daily extras (2×2 grid) ─────────────────────────

function ExtrasCard({
  title,
  icon: Icon,
  accentClass,
  onRefresh,
  refreshLabel = "New",
  loading,
  footerExtra,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  onRefresh: () => void;
  refreshLabel?: string;
  loading?: boolean;
  footerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
              accentClass,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="flex-1">{children}</div>
        <div className="flex flex-wrap items-center gap-2">
          {footerExtra}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            {refreshLabel}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function MotivationCard() {
  const dailyQuote = useDailyQuote();
  const [override, setOverride] = useState<ApiQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const quote = override ?? dailyQuote;

  const refresh = async () => {
    if (loading) return;
    setLoading(true);
    try {
      setOverride(await fetchRandomQuote());
    } catch {
      /* keep current */
    }
    setLoading(false);
  };

  return (
    <ExtrasCard
      title="Daily motivation"
      icon={QuoteIcon}
      accentClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
      onRefresh={refresh}
      refreshLabel="New quote"
      loading={loading}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <blockquote className="text-[15px] font-medium leading-relaxed tracking-tight">
            {quote.text}
          </blockquote>
          <p className="mt-1.5 text-xs text-muted-foreground">
            — {quote.author}
          </p>
        </>
      )}
    </ExtrasCard>
  );
}

function WordCard() {
  const [entry, setEntry] = useState<WordEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const { toggleSaved, isSaved } = useVocabulary();

  useEffect(() => {
    const ctrl = new AbortController();
    getDailyWord(ctrl.signal)
      .then((w) => {
        setEntry(w);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      setEntry(await fetchRandomWord());
    } catch {
      /* keep current */
    }
    setLoading(false);
  };

  const speak = () => {
    if (!entry) return;
    if (entry.audio)
      new Audio(entry.audio).play().catch(() => synthSpeak(entry.word));
    else synthSpeak(entry.word);
  };

  const saved = entry ? isSaved(entry) : false;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold">Word of the day</h3>
          </div>
          <Link
            to="/vocabulary"
            className="text-xs font-medium text-primary hover:underline"
          >
            More →
          </Link>
        </div>
        {/* Content */}
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !entry ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Couldn't load a word.
              </p>
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold tracking-tight">
                  {entry.word}
                </span>
                {entry.phonetic && (
                  <span className="font-mono text-sm text-muted-foreground">
                    {entry.phonetic}
                  </span>
                )}
                {entry.meanings[0] && (
                  <span className="text-xs italic text-muted-foreground">
                    {entry.meanings[0].partOfSpeech}
                  </span>
                )}
                <button
                  onClick={speak}
                  className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
                  aria-label="Pronounce"
                >
                  <Volume2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => toggleSaved(entry)}
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full transition-colors",
                    saved
                      ? "bg-primary/15 text-primary hover:bg-primary/25"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                  aria-label={saved ? "Unsave word" : "Save word"}
                >
                  {saved ? (
                    <BookmarkCheck className="h-3 w-3" />
                  ) : (
                    <Bookmark className="h-3 w-3" />
                  )}
                </button>
              </div>
              {entry.summary && (
                <p className="mt-2 text-sm text-muted-foreground leading-snug">
                  {entry.summary}
                </p>
              )}
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={refresh}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" />
                  New word
                </button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AffirmationCard() {
  const [text, setText] = useState(
    () => AFFIRMATIONS[getDailyIndex(AFFIRMATIONS.length)],
  );

  const refresh = () => {
    setText(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  };

  return (
    <ExtrasCard
      title="Affirmation"
      icon={Heart}
      accentClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
      onRefresh={refresh}
    >
      <p className="text-sm leading-relaxed">{text}</p>
    </ExtrasCard>
  );
}

function AdviceCard() {
  const [dose, setDose] = useState<Dose | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    getDailyDose("advice", ctrl.signal)
      .then((d) => {
        setDose(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      setDose(await fetchDose("advice"));
    } catch {
      /* keep current */
    }
    setLoading(false);
  };

  return (
    <ExtrasCard
      title="Advice"
      icon={Lightbulb}
      accentClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      onRefresh={refresh}
      loading={loading}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : dose ? (
        <p className="text-sm leading-relaxed">{dose.text}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Couldn't load.</p>
      )}
    </ExtrasCard>
  );
}

function JokeCard() {
  const [dose, setDose] = useState<Dose | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    getDailyDose("joke", ctrl.signal)
      .then((d) => {
        setDose(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const refresh = async () => {
    setRevealed(false);
    setLoading(true);
    try {
      setDose(await fetchDose("joke"));
    } catch {
      /* keep current */
    }
    setLoading(false);
  };

  const punchlineBtn = dose?.punchline ? (
    <button
      onClick={() => setRevealed((v) => !v)}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      {revealed ? "Hide punchline" : "Reveal punchline"}
    </button>
  ) : null;

  return (
    <ExtrasCard
      title="Joke"
      icon={Smile}
      accentClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
      onRefresh={refresh}
      loading={loading}
      footerExtra={punchlineBtn}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : dose ? (
        <div>
          <p className="text-sm leading-relaxed">{dose.text}</p>
          {revealed && dose.punchline && (
            <p className="mt-2 border-l-2 border-emerald-300 pl-3 text-sm italic text-muted-foreground dark:border-emerald-700">
              {dose.punchline}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Couldn't load.</p>
      )}
    </ExtrasCard>
  );
}

function DidYouKnowCard() {
  const [dose, setDose] = useState<Dose | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    getDailyDose("fact", ctrl.signal)
      .then((d) => {
        setDose(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      setDose(await fetchDose("fact"));
    } catch {
      /* keep current */
    }
    setLoading(false);
  };

  return (
    <ExtrasCard
      title="Did you know?"
      icon={FlaskConical}
      accentClass="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
      onRefresh={refresh}
      loading={loading}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : dose ? (
        <p className="text-sm leading-relaxed">{dose.text}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Couldn't load.</p>
      )}
    </ExtrasCard>
  );
}

// ── Main Dashboard ───────────────────────────────────────────

export default function Dashboard() {
  const now = useNow();
  const userName = useSettings((s) => s.userName);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1
            className="mt-0.5 text-[27px] font-semibold"
            style={{ letterSpacing: "-0.025em" }}
          >
            {greeting(now)}
            {userName ? `, ${userName}` : ""} 👋
          </h1>
        </div>
        <WorldClocks now={now} />
      </div>

      {/* Zone 1: Act now */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <TodayTasksCard />
        <FocusCard />
      </div>

      {/* Zone 2: Track + Motivate */}
      <div className="grid gap-5 lg:grid-cols-3">
        <HydrationCard />
        <UpNextCard />
        <MotivationCard />
      </div>

      {/* Zone 3: Word of the day */}
      <WordCard />

      {/* Zone 4: Daily extras */}
      <div className="grid gap-5 sm:grid-cols-2">
        <AffirmationCard />
        <AdviceCard />
        <DidYouKnowCard />
        <JokeCard />
      </div>
    </div>
  );
}
