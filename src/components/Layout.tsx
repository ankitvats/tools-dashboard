import { useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, LogOut, Search, ChevronDown, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV, SECTION_ORDER, SECTION_LABELS } from '@/app/nav'
import { cn, dayKey } from '@/lib/utils'
import { useUI } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { useTasks } from '@/store/tasks'
import { useAppointments } from '@/store/appointments'
import { isToday } from '@/lib/tasks'
import { ThemeToggle } from './ThemeToggle'
import { CommandPalette } from './CommandPalette'

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 py-1', collapsed && 'justify-center')}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[hsl(210_90%_60%)] text-white shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v7l4 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">Tools Dashboard</p>
          <p className="text-[11px] text-muted-foreground">Productivity hub</p>
        </div>
      )}
    </Link>
  )
}

function NavItemRow({
  to,
  label,
  icon: Icon,
  badge,
  onNavigate,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex w-full items-center gap-3 py-2 pl-4 pr-3 text-sm font-medium transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <>
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 bg-accent"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            </>
          )}
          <Icon className="relative h-4 w-4 shrink-0" />
          <span className="relative flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="relative rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-0.5 mt-5 px-4 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60 first:mt-3">
      {children}
    </p>
  )
}

function DesktopSectionedNav() {
  const { toolboxCollapsed, toggleToolbox } = useUI()
  const tasks = useTasks((s) => s.tasks)
  const appointments = useAppointments((s) => s.appointments)

  const openTaskCount = useMemo(() => tasks.filter((t) => isToday(t)).length, [tasks])
  const todayApptCount = useMemo(() => {
    const today = dayKey()
    return appointments.filter((a) => a.start.slice(0, 10) === today).length
  }, [appointments])

  const getBadge = (to: string) => {
    if (to === '/tasks') return openTaskCount
    if (to === '/appointments') return todayApptCount
    return undefined
  }

  const toolboxItems = NAV.filter((n) => n.section === 'toolbox')

  return (
    <nav>
      {SECTION_ORDER.map((section) => {
        const items = NAV.filter((n) => n.section === section)
        if (section === 'toolbox') {
          return (
            <div key={section}>
              <button
                onClick={toggleToolbox}
                className="mb-0.5 mt-5 flex w-full items-center gap-2 px-4 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                <span className="flex-1 text-left">{SECTION_LABELS[section]}</span>
                {toolboxCollapsed && (
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                    {toolboxItems.length} tools
                  </span>
                )}
                <motion.span
                  animate={{ rotate: toolboxCollapsed ? 0 : 180 }}
                  transition={{ duration: 0.18 }}
                  className="flex"
                >
                  <ChevronDown className="h-3 w-3" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {!toolboxCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    {items.map(({ to, label, icon }) => (
                      <NavItemRow key={to} to={to} label={label} icon={icon} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }
        return (
          <div key={section}>
            <SectionHead>{SECTION_LABELS[section]}</SectionHead>
            {items.map(({ to, label, icon }) => (
              <NavItemRow key={to} to={to} label={label} icon={icon} badge={getBadge(to)} />
            ))}
          </div>
        )
      })}
    </nav>
  )
}

function CollapsedNav() {
  return (
    <nav className="flex flex-col items-center gap-0.5 px-2 py-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          title={label}
          className={({ isActive }) =>
            cn(
              'relative grid h-9 w-9 place-items-center rounded-lg transition-colors',
              isActive ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-active-collapsed"
                  className="absolute inset-0 rounded-lg bg-accent"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="relative h-4 w-4" />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { sidebarCollapsed, toggleSidebar } = useUI()
  const { signOut } = useAuth()
  const mobileItems = NAV.filter((n) => n.mobile)

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card/40 transition-[width] duration-200 lg:flex',
          sidebarCollapsed ? 'w-16' : 'w-[260px]',
        )}
      >
        {/* Logo + Search */}
        <div className="px-3 pt-3">
          <Logo collapsed={sidebarCollapsed} />
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            title="Search commands (⌘K)"
            className={cn(
              'mt-3 flex w-full items-center rounded-lg border border-border bg-secondary/60 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
              sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-2 px-3 py-2',
            )}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">Search commands…</span>
                <kbd className="rounded border border-border bg-background px-1 py-0.5 text-[10px]">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        {/* Nav */}
        <div className="mt-1 flex-1 overflow-y-auto no-scrollbar">
          {sidebarCollapsed ? <CollapsedNav /> : <DesktopSectionedNav />}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-2">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <Link
                to="/settings"
                title="Settings"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <div className="flex flex-1 items-center justify-end gap-0.5">
                <button
                  onClick={toggleSidebar}
                  title="Collapse sidebar"
                  className="grid h-[30px] w-[30px] place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <Link
                  to="/settings"
                  title="Settings"
                  className="grid h-[30px] w-[30px] place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  className="grid h-[30px] w-[30px] place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/70 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <button
            aria-label="Search commands"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary focus-ring"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary focus-ring"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card p-3 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="rounded-xl border border-border p-3">
              <ThemeToggle />
            </div>
            <button
              onClick={() => { setMobileOpen(false); signOut() }}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className={cn('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[260px]')}>
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:pb-6 lg:pt-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/85 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-xl lg:hidden">
        {mobileItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
