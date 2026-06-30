import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Droplets, Timer, Plus } from 'lucide-react'
import type { ComponentType } from 'react'
import { NAV } from '@/app/nav'
import { useWater } from '@/store/water'
import { useTimer } from '@/store/timer'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  group: string
  execute: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const addWater = useWater((s) => s.add)
  const startTimer = useTimer((s) => s.start)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setSelected(0)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  const close = () => setOpen(false)

  const ACTIONS: Command[] = [
    {
      id: 'water-250',
      label: 'Add 250 ml water',
      icon: Droplets,
      group: 'Quick action',
      execute: () => { addWater(250); close() },
    },
    {
      id: 'water-500',
      label: 'Add 500 ml water',
      icon: Droplets,
      group: 'Quick action',
      execute: () => { addWater(500); close() },
    },
    {
      id: 'start-focus',
      label: 'Start focus session',
      icon: Timer,
      group: 'Quick action',
      execute: () => { navigate('/pomodoro'); startTimer(); close() },
    },
    {
      id: 'new-task',
      label: 'New task',
      icon: Plus,
      group: 'Quick action',
      execute: () => { navigate('/tasks?action=new'); close() },
    },
  ]

  const NAV_CMDS: Command[] = NAV.map((n) => ({
    id: `nav-${n.to}`,
    label: `Go to ${n.label}`,
    icon: n.icon,
    group: 'Navigate',
    execute: () => { navigate(n.to); close() },
  }))

  const all: Command[] = [...ACTIONS, ...NAV_CMDS]

  const filtered = query.trim()
    ? all.filter((c) =>
        `${c.label} ${c.group}`.toLowerCase().includes(query.toLowerCase()),
      )
    : all

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && filtered[selected]) filtered[selected].execute()
  }

  // Group commands, tracking global index
  const grouped: { group: string; items: (Command & { globalIdx: number })[] }[] = []
  let idx = 0
  for (const group of Array.from(new Set(filtered.map((c) => c.group)))) {
    const items = filtered.filter((c) => c.group === group).map((c) => ({ ...c, globalIdx: idx++ }))
    grouped.push({ group, items })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50"
            onClick={close}
          />
          <div className="fixed left-1/2 top-1/2 z-[71] w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2 px-4">
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Search bar */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
                onKeyDown={handleKeyDown}
                placeholder="Search commands…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No commands found.</p>
              ) : (
                grouped.map(({ group, items }) => (
                  <div key={group}>
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </p>
                    {items.map((cmd) => {
                      const Icon = cmd.icon
                      const isSelected = cmd.globalIdx === selected
                      return (
                        <button
                          key={cmd.id}
                          data-selected={isSelected}
                          onClick={cmd.execute}
                          onMouseEnter={() => setSelected(cmd.globalIdx)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            isSelected
                              ? 'bg-accent text-accent-foreground'
                              : 'text-foreground hover:bg-secondary',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {cmd.label}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
              <span>↑↓ navigate · ↵ select · Esc close</span>
              <span>⌘K to open</span>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
