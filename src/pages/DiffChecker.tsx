import { useMemo, useState } from 'react'
import { diffLines, diffWordsWithSpace, diffChars, diffJson, type Change } from 'diff'
import { ArrowLeftRight, Trash2, Columns2, AlignLeft, Copy } from 'lucide-react'
import { Card, CardContent, Button, Textarea, PageHeader, Badge } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Mode = 'lines' | 'words' | 'chars' | 'json'
type View = 'inline' | 'split'

const MODES: { value: Mode; label: string }[] = [
  { value: 'lines', label: 'Lines' },
  { value: 'words', label: 'Words' },
  { value: 'chars', label: 'Characters' },
  { value: 'json', label: 'JSON' },
]

export default function DiffChecker() {
  const { toast } = useToast()
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [mode, setMode] = useState<Mode>('lines')
  const [view, setView] = useState<View>('split')

  // split view only makes sense for line-based diffs
  const splitAllowed = mode === 'lines' || mode === 'json'
  const effectiveView: View = splitAllowed ? view : 'inline'

  const { parts, error } = useMemo(() => computeDiff(left, right, mode), [left, right, mode])

  const stats = useMemo(() => {
    let added = 0, removed = 0
    for (const p of parts) {
      const n = countUnits(p.value, mode)
      if (p.added) added += n
      else if (p.removed) removed += n
    }
    return { added, removed }
  }, [parts, mode])

  const swap = () => { setLeft(right); setRight(left) }
  const clear = () => { setLeft(''); setRight('') }
  const copyResult = async () => {
    const text = parts.map((p) => (p.added ? '+ ' : p.removed ? '- ' : '  ') + p.value).join('')
    try { await navigator.clipboard.writeText(text); toast({ kind: 'success', title: 'Diff copied' }) } catch { /* */ }
  }

  const hasInput = left !== '' || right !== ''
  const identical = hasInput && !error && stats.added === 0 && stats.removed === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diff Checker"
        subtitle="Paste two texts, code, or JSON and spot the differences."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={swap} disabled={!hasInput}>
              <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
            </Button>
            <Button variant="outline" size="sm" onClick={clear} disabled={!hasInput}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        }
      />

      {/* Inputs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PaneInput label="Original" value={left} onChange={setLeft} />
        <PaneInput label="Changed" value={right} onChange={setRight} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <SegBtns
          options={MODES}
          value={mode}
          onChange={(m) => setMode(m as Mode)}
        />
        <SegBtns
          options={[
            { value: 'split', label: 'Split', icon: Columns2, disabled: !splitAllowed },
            { value: 'inline', label: 'Inline', icon: AlignLeft },
          ]}
          value={effectiveView}
          onChange={(v) => setView(v as View)}
        />
        <div className="ml-auto flex items-center gap-2">
          {!error && hasInput && (
            <>
              <Badge tone="success">+{stats.added}</Badge>
              <Badge tone="destructive">−{stats.removed}</Badge>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={copyResult} disabled={!hasInput || !!error}>
            <Copy className="h-3.5 w-3.5" /> Copy diff
          </Button>
        </div>
      </div>

      {/* Result */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : !hasInput ? (
            <div className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
              Enter text in both panes to see the diff.
            </div>
          ) : identical ? (
            <div className="grid place-items-center py-16 text-center text-sm text-success">
              ✓ The two inputs are identical.
            </div>
          ) : effectiveView === 'split' ? (
            <SplitView parts={parts} />
          ) : (
            <InlineView parts={parts} mode={mode} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Diff computation ──────────────────────────────────────
function computeDiff(left: string, right: string, mode: Mode): { parts: Change[]; error?: string } {
  if (left === '' && right === '') return { parts: [] }
  try {
    if (mode === 'json') {
      const a = JSON.parse(left || 'null')
      const b = JSON.parse(right || 'null')
      return { parts: diffJson(a, b) }
    }
    if (mode === 'words') return { parts: diffWordsWithSpace(left, right) }
    if (mode === 'chars') return { parts: diffChars(left, right) }
    return { parts: diffLines(left, right) }
  } catch (e) {
    return { parts: [], error: mode === 'json' ? 'Invalid JSON — check both inputs for syntax errors.' : String(e) }
  }
}

function countUnits(value: string, mode: Mode): number {
  if (mode === 'chars') return value.length
  if (mode === 'words') return value.trim() ? value.trim().split(/\s+/).length : 0
  // lines / json
  return value.split('\n').filter((l, i, arr) => l !== '' || i < arr.length - 1).length
}

// ── Inline view ───────────────────────────────────────────
function InlineView({ parts, mode }: { parts: Change[]; mode: Mode }) {
  const lineBased = mode === 'lines' || mode === 'json'

  if (!lineBased) {
    return (
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
        {parts.map((p, i) => {
          const cls = p.added ? 'bg-success/15 text-success' : p.removed ? 'bg-destructive/15 text-destructive line-through decoration-destructive/50' : 'text-foreground'
          return <span key={i} className={cls}>{p.value}</span>
        })}
      </pre>
    )
  }

  type InlineRow = { sign: '+' | '-' | ' '; text: string; leftLn: number | null; rightLn: number | null; cls: string }
  const rows: InlineRow[] = []
  let leftLn = 1, rightLn = 1
  for (const p of parts) {
    const lines = p.value.replace(/\n$/, '').split('\n')
    const sign: '+' | '-' | ' ' = p.added ? '+' : p.removed ? '-' : ' '
    const cls = p.added ? 'bg-success/15 text-success' : p.removed ? 'bg-destructive/15 text-destructive' : 'text-foreground'
    for (const ln of lines) {
      rows.push({ sign, text: ln || ' ', cls, leftLn: p.added ? null : leftLn, rightLn: p.removed ? null : rightLn })
      if (!p.added) leftLn++
      if (!p.removed) rightLn++
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs leading-relaxed">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.cls}>
              <td className="select-none border-r border-border px-2 py-px text-right tabular-nums text-muted-foreground/50 w-[3ch]">{r.leftLn ?? ''}</td>
              <td className="select-none border-r border-border px-2 py-px text-right tabular-nums text-muted-foreground/50 w-[3ch]">{r.rightLn ?? ''}</td>
              <td className="select-none border-r border-border px-2 py-px text-muted-foreground/60 w-4">{r.sign}</td>
              <td className="px-3 py-px whitespace-pre">{r.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Split (side-by-side) view ─────────────────────────────
type Row = { left?: string; right?: string; type: 'same' | 'add' | 'del' | 'change' }

function buildRows(parts: Change[]): Row[] {
  const rows: Row[] = []
  let pendDel: string[] = []
  let pendAdd: string[] = []

  const toLines = (v: string) => v.replace(/\n$/, '').split('\n')

  const flush = () => {
    const n = Math.max(pendDel.length, pendAdd.length)
    for (let i = 0; i < n; i++) {
      const l = pendDel[i]
      const r = pendAdd[i]
      if (l !== undefined && r !== undefined) rows.push({ left: l, right: r, type: 'change' })
      else if (l !== undefined) rows.push({ left: l, type: 'del' })
      else rows.push({ right: r, type: 'add' })
    }
    pendDel = []
    pendAdd = []
  }

  for (const p of parts) {
    if (p.removed) pendDel.push(...toLines(p.value))
    else if (p.added) pendAdd.push(...toLines(p.value))
    else {
      flush()
      for (const ln of toLines(p.value)) rows.push({ left: ln, right: ln, type: 'same' })
    }
  }
  flush()
  return rows
}

function SplitView({ parts }: { parts: Change[] }) {
  const rows = useMemo(() => buildRows(parts), [parts])
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs leading-relaxed">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <Cell text={r.left} side="left" type={r.type} />
              <Cell text={r.right} side="right" type={r.type} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ text, side, type }: { text?: string; side: 'left' | 'right'; type: Row['type'] }) {
  const active = side === 'left' ? type === 'del' || type === 'change' : type === 'add' || type === 'change'
  const cls = active
    ? side === 'left'
      ? 'bg-destructive/10'
      : 'bg-success/10'
    : type === 'same'
    ? ''
    : 'bg-muted/40'
  const sign = active ? (side === 'left' ? '-' : '+') : ' '
  return (
    <td className={cn('w-1/2 whitespace-pre-wrap break-words border-l border-border px-3 align-top', cls)}>
      <span className="select-none opacity-40">{sign} </span>
      {text ?? ' '}
    </td>
  )
}

// ── Small UI helpers ──────────────────────────────────────
function PaneInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/90">{label}</label>
        <span className="text-xs text-muted-foreground">{value.split('\n').length} lines · {value.length} chars</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Paste ${label.toLowerCase()} here…`}
        spellCheck={false}
        className="min-h-[240px] font-mono text-xs leading-relaxed"
      />
    </div>
  )
}

function SegBtns<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; icon?: typeof Columns2; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {options.map((o) => {
        const Icon = o.icon
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => !o.disabled && onChange(o.value)}
            disabled={o.disabled}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:opacity-40',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
