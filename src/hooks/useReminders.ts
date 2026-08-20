import { useEffect, useRef } from "react";
import { useSettings } from "@/store/settings";
import { useWater } from "@/store/water";
import { useTasks } from "@/store/tasks";
import { useAppointments } from "@/store/appointments";
import { notify, playChime } from "@/lib/notify";
import { backgroundRemindersActive } from "@/lib/pwa";

/**
 * Central reminder engine. Mounted once at app root.
 * - Water & stretch: interval nudges (with snooze/pause via settings).
 * - Tasks: fire when reminderAt passes.
 * - Appointments: fire `reminderLead` minutes before start.
 */
export function useReminders() {
  const s = useSettings();
  const waterEntries = useWater((w) => w.entries);
  const tasks = useTasks((t) => t.tasks);
  const updateTask = useTasks((t) => t.update);
  const appts = useAppointments((a) => a.appointments);
  const updateAppt = useAppointments((a) => a.update);

  // refs to read latest without re-subscribing the interval
  const lastWater = useRef(Date.now());
  const lastStretch = useRef(Date.now());

  useEffect(() => {
    // reset the water clock whenever the user drinks
    lastWater.current = Date.now();
  }, [waterEntries.length]);

  useEffect(() => {
    const tick = setInterval(() => {
      // When OS-level scheduled reminders are active, they cover everything
      // (even when the tab is closed) — stand down to avoid duplicate alerts.
      if (backgroundRemindersActive()) return;

      const now = Date.now();
      const st = useSettings.getState();

      if (
        st.waterReminderEnabled &&
        now - lastWater.current >= st.waterReminderMin * 60_000
      ) {
        lastWater.current = now;
        notify("💧 Time to hydrate", "Take a sip of water to stay on track.");
        if (st.soundEnabled) playChime("water");
      }
      if (
        st.stretchReminderEnabled &&
        now - lastStretch.current >= st.stretchReminderMin * 60_000
      ) {
        lastStretch.current = now;
        notify(
          "🧘 Time to wake up & stretch",
          "Stand up, move around, and loosen up for a minute.",
        );
        if (st.soundEnabled) playChime("stretch");
      }

      // task reminders
      for (const t of useTasks.getState().tasks) {
        if (
          t.reminderAt &&
          !t.reminderFired &&
          !t.completed &&
          new Date(t.reminderAt).getTime() <= now
        ) {
          updateTask(t.id, { reminderFired: true });
          notify("✅ Task reminder", t.title);
          if (st.soundEnabled) playChime("task");
        }
      }

      // appointment reminders
      for (const a of useAppointments.getState().appointments) {
        if (a.reminderFired) continue;
        const fireAt = new Date(a.start).getTime() - a.reminderLead * 60_000;
        if (fireAt <= now && new Date(a.start).getTime() >= now - 60_000) {
          updateAppt(a.id, { reminderFired: true });
          notify(
            "📅 " + a.title,
            a.reminderLead ? `Starts in ${a.reminderLead} min` : "Starting now",
          );
          if (st.soundEnabled) playChime("appointment");
        }
      }
    }, 15_000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep deps referenced for lint clarity
  void s;
  void tasks;
  void appts;
}

export function snoozeWater() {
  /* handled by resetting via a fresh entry timer; placeholder for UI symmetry */
}
