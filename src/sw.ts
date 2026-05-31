/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Workbox precache manifest injected at build time.
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Focus or open the app when a (possibly scheduled) notification is clicked.
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  notification.close()
  const targetPath = (notification.data && notification.data.path) || '/'
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client && targetPath) {
            try {
              await (client as WindowClient).navigate(targetPath)
            } catch {
              /* navigation may be blocked cross-origin; ignore */
            }
          }
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetPath)
    })(),
  )
})

// Allow the page to ask the SW to schedule notifications (used as a relay).
self.addEventListener('message', (event) => {
  const data = event.data
  if (data?.type === 'PING') {
    event.ports[0]?.postMessage({ ok: true })
  }
})

export {}
