// Browser notification + sound helpers. All guarded for SSR/no-permission.

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export function notify(title: string, body?: string, tag?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag, icon: '/favicon.svg' })
  } catch {
    /* some browsers require a ServiceWorker for notifications */
  }
}

let audioCtx: AudioContext | null = null

/** Pleasant two-note chime via WebAudio — no asset files needed. */
export function playChime(kind: 'success' | 'alert' = 'success') {
  try {
    audioCtx ??= new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx
    const now = ctx.currentTime
    const notes = kind === 'success' ? [523.25, 783.99] : [880, 587.33]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.16
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.45)
    })
  } catch {
    /* audio not available */
  }
}
