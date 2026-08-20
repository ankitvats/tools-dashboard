import { Howl } from "howler";

// Browser notification + sound helpers. All guarded for SSR/no-permission.

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function notify(title: string, body?: string, tag?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  try {
    new Notification(title, { body, tag, icon: "/favicon.svg" });
  } catch {
    /* some browsers require a ServiceWorker for notifications */
  }
}

let audioCtx: AudioContext | null = null;

type ChimeKind =
  | "success"
  | "alert"
  | "pomodoro"
  | "water"
  | "stretch"
  | "task"
  | "appointment";

const soundFiles: Partial<Record<ChimeKind, string>> = {
  pomodoro: "/sounds/pomodoro.mp3",
  water: "/sounds/water.mp3",
  stretch: "/sounds/stretch.mp3",
  task: "/sounds/task.mp3",
  appointment: "/sounds/appointment.mp3",
};

/** Small purpose-specific notification sounds via WebAudio — no asset files needed. */
function playSynthChime(kind: ChimeKind) {
  try {
    audioCtx ??= new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const patterns: Record<ChimeKind, number[]> = {
      success: [523.25, 783.99],
      alert: [880, 587.33],
      pomodoro: [659.25, 783.99, 987.77, 783.99],
      water: [1046.5, 1318.5],
      stretch: [392, 493.88, 587.33],
      task: [783.99, 659.25],
      appointment: [587.33, 783.99, 587.33],
    };
    const notes = patterns[kind];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "pomodoro" ? "square" : "sine";
      osc.frequency.value = freq;
      const t = now + i * (kind === "pomodoro" ? 0.13 : 0.16);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(
        kind === "pomodoro" ? 0.16 : 0.25,
        t + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        t + (kind === "pomodoro" ? 0.28 : 0.4),
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (kind === "pomodoro" ? 0.32 : 0.45));
    });
  } catch {
    /* audio not available */
  }
}

/** Prefer an audio asset when available; synthesized sounds keep notifications functional without assets. */
export function playChime(kind: ChimeKind = "success") {
  const src = soundFiles[kind];
  if (!src) {
    playSynthChime(kind);
    return;
  }

  let handled = false;
  const fallback = () => {
    if (handled) return;
    handled = true;
    playSynthChime(kind);
  };

  try {
    const sound = new Howl({
      src: [src],
      volume: 0.8,
      onplayerror: fallback,
      onloaderror: fallback,
    });
    sound.play();
  } catch {
    fallback();
  }
}

/** Short tactile "pop" blip. `level` raises pitch (combo streak); `special` for golden bubbles. */
export function playPop(level = 0, special = false) {
  try {
    audioCtx ??= new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = special ? "sine" : "triangle";
    const base =
      (special ? 720 : 420 + Math.random() * 220) *
      (1 + Math.min(level, 12) * 0.045);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.5, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    /* audio not available */
  }
}
