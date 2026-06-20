const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Hors ligne — Wab Rédaction</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #fff; color: #111; text-align: center; padding: 1rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    p { margin: 0; color: #666; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div>
    <h1>Hors ligne</h1>
    <p>Vérifiez votre connexion internet et réessayez.</p>
  </div>
</body>
</html>`;

function offlineNavigationResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// Fetch handler requis par Chrome pour l'installabilité PWA
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.mode === 'navigate') {
        return offlineNavigationResponse();
      }
      return Response.error();
    })
  );
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
