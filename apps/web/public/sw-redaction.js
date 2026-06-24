const OFFLINE_CACHE = 'redaction-offline-v2';
const OFFLINE_URL = '/redaction-offline.html';

const OFFLINE_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Indisponible — Wab Rédaction</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:1rem;text-align:center;color:#f4f4f5;background:linear-gradient(145deg,#0c0c0f,#1d3557 52%,#8b1538)}.card{max-width:22rem;padding:2rem 1.5rem;border-radius:1.25rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}h1{font-size:1.2rem;margin:0 0 .75rem}p{margin:0;font-size:.95rem;opacity:.85}button{margin-top:1.25rem;width:100%;padding:.85rem;border:none;border-radius:.75rem;background:#c41e3a;color:#fff;font-weight:600;cursor:pointer}</style></head><body><div class="card"><h1>Espace rédaction indisponible</h1><p>Le serveur ne répond pas. Réessayez dans quelques instants.</p><button type="button" onclick="location.reload()">Réessayer</button></div></body></html>`;

const SERVER_DOWN_STATUSES = new Set([502, 503, 504]);

function isRedactionWindow(client) {
  try {
    const path = new URL(client.url).pathname;
    return path === '/redaction' || path.startsWith('/redaction/');
  } catch {
    return client.url.includes('/redaction');
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('redaction-offline-') && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function offlineHtmlResponse(html) {
  return new Response(html, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function offlineNavigationResponse() {
  return caches.match(OFFLINE_URL).then((cached) => {
    if (cached) return cached.text().then(offlineHtmlResponse);
    return offlineHtmlResponse(OFFLINE_HTML);
  });
}

function shouldServeOfflinePage(request, response) {
  return request.mode === 'navigate' && (!response || SERVER_DOWN_STATUSES.has(response.status));
}

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (shouldServeOfflinePage(event.request, response)) {
          return offlineNavigationResponse();
        }
        return response;
      })
      .catch(() => {
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
      tag: 'wab-redaction-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/redaction';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client && isRedactionWindow(client)) {
          if ('navigate' in client) {
            return client.navigate(url).then((c) => (c ? c.focus() : client.focus()));
          }
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
