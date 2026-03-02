// Levio Service Worker — handles push notifications and offline caching

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// --- Push notification received ---
self.addEventListener('push', event => {
  let payload = { title: 'Levio', body: "I'm here.", data: {} };
  try { payload = event.data?.json() || payload; } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.data?.type || 'levio',
      data: payload.data || {},
      requireInteraction: false,
    })
  );
});

// --- Notification clicked — open app at the right screen ---
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};

  let url = '/';
  if (data.type === 'pre_nudge' && data.eventId)    url = `/dashboard?nudge=${data.eventId}`;
  else if (data.type === 'post_checkin' && data.eventId) url = `/dashboard?checkin=${data.eventId}`;
  else if (data.type === 'endofday')                 url = '/endofday';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
