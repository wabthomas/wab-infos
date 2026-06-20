// Fetch handler requis par Chrome pour l'installabilité PWA
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Wab-infos', body: '', url: '/redaction' };
  try {
    data = { ...data, ...event.data?.json() };
  } catch {
    data.body = event.data?.text() ?? '';
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url },
      tag: 'redaction-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/redaction';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client && client.url.includes('/redaction')) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
