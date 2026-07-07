const OFFLINE_CACHE = 'redaction-offline-v2';
const OFFLINE_URL = '/redaction-offline.html';

/** Fallback si le cache SW n'est pas encore prêt (garder aligné avec public/redaction-offline.html). */
const OFFLINE_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0c0c0f"><title>Indisponible — Wab Rédaction</title><style>*, *::before, *::after { box-sizing: border-box; }html, body { height: 100%; margin: 0; }body {font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;display: flex;align-items: center;justify-content: center;padding: max(1.25rem, env(safe-area-inset-top)) 1.25rem max(1.25rem, env(safe-area-inset-bottom));color: #f4f4f5;background: linear-gradient(145deg, #0c0c0f 0%, #1d3557 52%, #8b1538 100%);text-align: center;-webkit-font-smoothing: antialiased;}.card {width: min(100%, 22rem);padding: 2rem 1.5rem;border-radius: 1.25rem;background: rgba(255, 255, 255, 0.06);border: 1px solid rgba(255, 255, 255, 0.12);backdrop-filter: blur(12px);box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);}.logo {width: 4rem;height: 4rem;margin: 0 auto 1.25rem;border-radius: 1rem;box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);}.brand {font-size: 0.75rem;font-weight: 700;letter-spacing: 0.14em;text-transform: uppercase;color: rgba(255, 255, 255, 0.65);margin: 0 0 0.5rem;}h1 {font-size: 1.25rem;font-weight: 700;line-height: 1.3;margin: 0 0 0.75rem;}p {margin: 0;font-size: 0.95rem;line-height: 1.55;color: rgba(255, 255, 255, 0.78);}button {margin-top: 1.5rem;width: 100%;padding: 0.85rem 1rem;font-size: 0.95rem;font-weight: 600;border: none;border-radius: 0.75rem;background: #c41e3a;color: #fff;cursor: pointer;}button:active { transform: scale(0.98); }</style></head><body><div class="card"><img class="logo" src="/icons/icon-192.png" width="64" height="64" alt=""><p class="brand">Wab Rédaction</p><h1>Espace rédaction indisponible</h1><p>Le serveur ne répond pas pour le moment. Réessayez dans quelques instants.</p><button type="button" onclick="location.reload()">Réessayer</button></div></body></html>`;

const SERVER_DOWN_STATUSES = new Set([502, 503, 504]);

function isRedactionAppClient(client) {
  try {
    return new URL(client.url).origin === self.location.origin;
  } catch {
    return true;
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/comments';
  const targetUrl = rawUrl.startsWith('http')
    ? rawUrl
    : `${self.location.origin}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client && isRedactionAppClient(client)) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then((c) => (c ? c.focus() : client.focus()));
          }
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.FCM_NOTIFICATION_TAG = 'wab-redaction-notification';
self.FCM_DEFAULT_URL = '/comments';
try {
  importScripts('/fcm-background.js');
} catch (error) {
  console.error('[sw-redaction] FCM indisponible', error);
}
