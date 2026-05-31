import { Monitor, Moon, Sun } from 'lucide-react'
import { useSettings, type Theme } from '@/store/settings'
import { cn } from '@/lib/utils'

const opts: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

export function ThemeToggle() {
  const { theme, set } = useSettings()
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      {opts.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          aria-label={label}
          title={label}
          onClick={() => set('theme', value)}
          className={cn(
            'grid h-8 w-8 place-items-center rounded-md transition-colors focus-ring',
            theme === value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
