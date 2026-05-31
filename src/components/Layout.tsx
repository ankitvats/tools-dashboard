import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV } from '@/app/nav'
import { cn } from '@/lib/utils'
import { useUI } from '@/store/ui'
import { ThemeToggle } from './ThemeToggle'

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 py-1', collapsed ? 'justify-center px-0' : 'px-2')}>
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

function SidebarLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3',
              isActive ? 'text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-accent"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="relative h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="relative">{label}</span>}
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
  const mobileItems = NAV.filter((n) => n.mobile)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card/40 p-3 transition-[width] duration-200 lg:flex',
          sidebarCollapsed ? 'w-16' : 'w-60',
        )}
      >
        <Logo collapsed={sidebarCollapsed} />
        <div className="mt-4 flex-1 overflow-y-auto no-scrollbar">
          <SidebarLinks collapsed={sidebarCollapsed} />
        </div>

        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'mt-2 flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
          )}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>

        {!sidebarCollapsed && (
          <div className="mt-2 rounded-xl border border-border bg-background/60 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Appearance</p>
            <ThemeToggle />
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/70 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Logo />
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary focus-ring"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex-1 overflow-y-auto">
                <SidebarLinks onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="rounded-xl border border-border p-3">
                <ThemeToggle />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className={cn('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60')}>
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
