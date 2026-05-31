# Tools Dashboard

A premium, responsive productivity hub for remote professionals — Pomodoro, tasks, hydration, stretch breaks, motivation, and appointments, with a productivity score and analytics. Built to feel like Linear / Notion / Raycast.

> 100% client-side. All data lives in your browser (localStorage via Zustand `persist`). No backend required, but the schema is flat and serializable so it ports cleanly to one.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle to dist/
npm run preview  # serve the production build
```

---

## Tech stack

| Concern        | Choice |
|----------------|--------|
| Framework      | React 18 + TypeScript |
| Build          | Vite |
| Styling        | Tailwind CSS (CSS-variable design tokens, light/dark) |
| State          | Zustand + `persist` middleware (localStorage) |
| Charts         | Recharts |
| Icons          | Lucide |
| Animation      | Framer Motion |
| Routing        | React Router |
| Dates          | date-fns |

**Notes / deliberate deviations from the brief**
- **UI components** are hand-built in the shadcn/ui style (same tokens & API shape) rather than pulled via the shadcn CLI, so the project is self-contained with zero Radix runtime.
- **Calendar** is a custom month grid (date-fns) instead of FullCalendar — lighter, themed, and dependency-free.
- **Storage** uses localStorage through Zustand `persist` rather than raw IndexedDB. Each domain is its own key, so swapping the persistence layer (IndexedDB or a REST/GraphQL backend) is isolated to `src/store/*`.

---

## Folder structure

```
src/
├── app/
│   └── nav.tsx              # sidebar / bottom-nav config
├── components/
│   ├── ui/                  # design system primitives
│   │   ├── primitives.tsx   # Button, Card, Input, Badge, Switch, Progress, Ring…
│   │   ├── dialog.tsx       # modal (portal + Framer Motion)
│   │   ├── tabs.tsx         # animated segmented tabs
│   │   ├── toast.tsx        # ToastProvider + useToast()
│   │   └── select.tsx       # Select, Dropdown, MenuItem
│   ├── Layout.tsx           # sidebar + topbar + mobile drawer + bottom nav
│   ├── RightRail.tsx        # quick stats + upcoming reminders
│   └── ThemeToggle.tsx
├── hooks/
│   ├── useStats.ts          # derived metrics + productivity score
│   ├── useReminders.ts      # central reminder engine (water/stretch/task/appt)
│   ├── useTheme.ts          # applies light/dark/system
│   └── useNow.ts            # ticking clock + greeting
├── lib/
│   ├── types.ts             # domain model
│   ├── data.ts              # quotes + stretch library
│   ├── notify.ts            # Notification API + WebAudio chime
│   └── utils.ts             # cn, uid, date keys, clamp, formatClock…
├── pages/                   # one module per route
│   ├── Dashboard.tsx  Pomodoro.tsx  Tasks.tsx  Water.tsx
│   ├── Stretch.tsx    Motivation.tsx  Appointments.tsx
│   └── Insights.tsx   Settings.tsx
├── store/                   # Zustand slices (one localStorage key each)
│   ├── settings.ts  tasks.ts  pomodoro.ts  water.ts
│   ├── stretch.ts   appointments.ts  motivation.ts
├── App.tsx                  # routes + providers + global hooks
├── main.tsx
└── index.css                # tokens + base layer
```

---

## Data model (`src/lib/types.ts`)

Each store persists to its own key: `td-tasks`, `td-pomodoro`, `td-water`, `td-stretch`, `td-appointments`, `td-motivation`, `td-theme` (settings).

- **Task** — `title, notes?, completed, priority(low|medium|high), category?, dueDate?, reminderAt?, order, createdAt, completedAt?`
- **PomodoroSession** — `kind(focus|short|long), durationSec, completedAt, day`
- **WaterEntry** — `amountMl, at, day`
- **StretchLog** — `stretchId, at, day`
- **Appointment** — `title, description?, location?, meetingLink?, start, durationMin, reminderLead(0|15|30|60), reminderFired?`
- **Settings** — theme, pomodoro durations & cadence, water goal/interval, stretch interval, sound & notification toggles.

`day` is a local `YYYY-MM-DD` key (`dayKey()`), which makes all daily/weekly roll-ups O(n) filters with no timezone drift.

---

## Productivity score

Computed in `useStats.ts`, blended 0–100:

```
score = taskScore·0.30 + focusScore·0.30 + waterScore·0.25 + stretchScore·0.15
```

where each sub-score is a capped percentage of a daily target (tasks due today completed, 8 focus sessions, water goal, 5 stretches).

---

## Reminder engine

`useReminders()` mounts once in `App`. A 15s interval reads the latest store snapshots and fires:
- **Water / stretch** — interval nudges, gated by the per-feature enable toggle and interval; the water clock resets whenever you log a drink.
- **Tasks** — when `reminderAt` passes (once, via `reminderFired`).
- **Appointments** — `reminderLead` minutes before `start`.

Each uses the Notification API (if permission granted in Settings) plus an optional WebAudio chime — no audio asset files.

---

## Design system

- **Tokens** are HSL CSS variables in `index.css` for both themes; Tailwind maps them to semantic colors (`bg-card`, `text-muted-foreground`, `border-border`, …). Theme flash is prevented by an inline script in `index.html`.
- **Primitives**: Button (6 variants × 4 sizes), Card, Input/Textarea/Label, Badge, Switch, Progress, circular `Ring`, animated Tabs, Dialog, Toasts, Select/Dropdown.
- **Motion**: page transitions, list add/remove, shared-layout active nav indicator, spring dialogs/toasts.

## UX flows
- **Sidebar** (desktop) ↔ **bottom nav + drawer** (mobile), with an optional **right rail** (xl+) for live stats and upcoming events.
- Create/edit flows use a single dialog component per module; destructive actions confirm; every mutation emits a toast.

## Accessibility
- Semantic roles (`dialog`, `switch`, `tablist`/`tab`), `aria-label`s on icon buttons, Escape-to-close + scroll-lock on modals, visible focus rings (`focus-ring`), `prefers-color-scheme` support, and `tabular-nums` for stable numeric UIs.

## Responsiveness
- Mobile-first grids, `env(safe-area-inset-bottom)` aware bottom nav, fluid charts via `ResponsiveContainer`, and touch-friendly hit targets.
