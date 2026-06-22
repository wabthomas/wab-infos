const OFFLINE_CACHE = 'wab-site-offline-v1';
const OFFLINE_URL = '/offline.html';

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Hors ligne — Wab-infos</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #fff; color: #111; text-align: center; padding: 1rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #c41e3a; }
    p { margin: 0; color: #666; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div>
    <h1>Wab-infos</h1>
    <p>Vérifiez votre connexion internet et réessayez.</p>
  </div>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('wab-site-offline-') && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
});

function offlineNavigationResponse() {
  return caches.match(OFFLINE_URL).then((cached) => {
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

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
  let data = { title: 'Wab-infos', body: '', url: '/' };
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
      tag: 'wab-article-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          if ('navigate' in client) {
            return (client as WindowClient).navigate(url).then((c) => c?.focus() ?? client.focus());
          }
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
