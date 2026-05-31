import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TabsProps {
  tabs: { value: string; label: string; icon?: React.ReactNode }[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const id = React.useId()
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-xl bg-secondary p-1', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-ring',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.div
                layoutId={`tab-bg-${id}`}
                className="absolute inset-0 rounded-lg bg-card shadow-soft"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {t.icon}
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
