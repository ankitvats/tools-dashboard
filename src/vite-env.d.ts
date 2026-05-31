/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Notification Triggers API (Chromium, experimental) — not in TS DOM libs.
declare class TimestampTrigger {
  constructor(timestamp: number)
}

interface NotificationOptions {
  showTrigger?: TimestampTrigger
  // non-standard but supported where triggers exist
  data?: any
}

interface GetNotificationOptions {
  tag?: string
  includeTriggered?: boolean
}
