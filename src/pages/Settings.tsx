import { Bell, Download, Trash2, Upload, User, Smartphone, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Switch, Badge, PageHeader } from '@/components/ui/primitives'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useToast } from '@/components/ui/toast'
import { useSettings } from '@/store/settings'
import { ensureNotificationPermission } from '@/lib/notify'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { supportsNotificationTriggers } from '@/lib/pwa'

const STORE_KEYS = ['td-theme', 'td-tasks', 'td-pomodoro', 'td-water', 'td-stretch', 'td-appointments', 'td-motivation']

export default function SettingsPage() {
  const s = useSettings()
  const { toast } = useToast()
  const { canInstall, installed, promptInstall } = useInstallPrompt()
  const bgSupported = supportsNotificationTriggers()

  const enableNotifications = async (v: boolean) => {
    if (v) {
      const ok = await ensureNotificationPermission()
      s.set('notificationsEnabled', ok)
      toast(ok ? { kind: 'success', title: 'Notifications enabled' } : { kind: 'warning', title: 'Permission denied', description: 'Allow notifications in your browser settings.' })
    } else {
      s.set('notificationsEnabled', false)
    }
  }

  const exportData = () => {
    const data: Record<string, unknown> = {}
    STORE_KEYS.forEach((k) => {
      const v = localStorage.getItem(k)
      if (v) data[k] = JSON.parse(v)
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tools-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ kind: 'success', title: 'Data exported' })
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        Object.entries(data).forEach(([k, v]) => {
          if (STORE_KEYS.includes(k)) localStorage.setItem(k, JSON.stringify(v))
        })
        toast({ kind: 'success', title: 'Data imported', description: 'Reloading…' })
        setTimeout(() => location.reload(), 800)
      } catch {
        toast({ kind: 'warning', title: 'Invalid file' })
      }
    }
    reader.readAsText(file)
  }

  const resetAll = () => {
    if (!confirm('Erase all local data? This cannot be undone.')) return
    STORE_KEYS.forEach((k) => localStorage.removeItem(k))
    location.reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Tune the app to fit your routine." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Profile & appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your name</Label>
            <Input value={s.userName} onChange={(e) => s.set('userName', e.target.value)} placeholder="How should we greet you?" className="max-w-sm" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Theme</Label>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pomodoro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField label="Focus (min)" value={s.focusMin} onChange={(v) => s.set('focusMin', v)} min={1} />
            <NumberField label="Short break" value={s.shortBreakMin} onChange={(v) => s.set('shortBreakMin', v)} min={1} />
            <NumberField label="Long break" value={s.longBreakMin} onChange={(v) => s.set('longBreakMin', v)} min={1} />
            <NumberField label="Until long break" value={s.sessionsBeforeLongBreak} onChange={(v) => s.set('sessionsBeforeLongBreak', v)} min={1} />
          </div>
          <ToggleRow label="Auto-start next session" checked={s.autoStartNext} onChange={(v) => s.set('autoStartNext', v)} />
          <ToggleRow label="Sound notifications" checked={s.soundEnabled} onChange={(v) => s.set('soundEnabled', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Water & stretch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumberField label="Water goal (ml)" value={s.waterGoalMl} onChange={(v) => s.set('waterGoalMl', v)} min={250} step={250} />
            <NumberField label="Water reminder (min)" value={s.waterReminderMin} onChange={(v) => s.set('waterReminderMin', v)} min={5} step={5} />
            <NumberField label="Stretch reminder (min)" value={s.stretchReminderMin} onChange={(v) => s.set('stretchReminderMin', v)} min={5} step={5} />
          </div>
          <ToggleRow label="Water reminders" checked={s.waterReminderEnabled} onChange={(v) => s.set('waterReminderEnabled', v)} />
          <ToggleRow label="Stretch reminders" checked={s.stretchReminderEnabled} onChange={(v) => s.set('stretchReminderEnabled', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Notifications & reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Enable desktop notifications"
            description="Reminders for water, stretch, tasks and appointments."
            checked={s.notificationsEnabled}
            onChange={enableNotifications}
          />
          <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            {bgSupported ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
            <p className="text-muted-foreground">
              {bgSupported
                ? 'Background reminders are supported — notifications fire even when this tab is closed (install the app for best results).'
                : 'This browser only delivers reminders while the app tab is open. Use a Chromium browser (Chrome/Edge) for background reminders.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Smartphone className="h-4 w-4" /> Install app</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {installed ? (
            <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Installed</Badge>
          ) : canInstall ? (
            <Button onClick={promptInstall}>
              <Smartphone className="h-4 w-4" /> Install Tools Dashboard
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Use your browser’s “Install app” / “Add to Home Screen” option to install. Runs offline and unlocks reliable background reminders.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <label>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
            />
            <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-secondary">
              <Upload className="h-4 w-4" /> Import
            </span>
          </label>
          <Button variant="destructive" onClick={resetAll}>
            <Trash2 className="h-4 w-4" /> Reset all data
          </Button>
        </CardContent>
      </Card>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Tools Dashboard · all data stored locally in your browser
      </p>
    </div>
  )
}

function NumberField({ label, value, onChange, min, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={min} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
