// Sproutine service worker: notifications only (no offline caching).
self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {}
    } catch {
      return { body: event.data ? event.data.text() : '' }
    }
  })()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Rosie', {
      body: data.body || '',
      icon: '/icons/sproutine.png',
      badge: '/favicon-96x96.png',
      // Same-origin paths only.
      data: { url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/chat' },
      tag: 'sproutine-nudge',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/chat'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ('focus' in w) {
          w.navigate(url)
          return w.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
