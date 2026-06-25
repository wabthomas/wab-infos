const OFFLINE_CACHE = 'wab-site-offline-v2';
const OFFLINE_URL = '/offline.html';

/** Fallback si le cache SW n'est pas encore prêt (garder aligné avec public/offline.html). */
const OFFLINE_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0c0c0f"><title>Indisponible — Wab-infos</title><style>*, *::before, *::after { box-sizing: border-box; }html, body { height: 100%; margin: 0; }body {font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;display: flex;align-items: center;justify-content: center;padding: max(1.25rem, env(safe-area-inset-top)) 1.25rem max(1.25rem, env(safe-area-inset-bottom));color: #f4f4f5;background: linear-gradient(145deg, #0c0c0f 0%, #1d3557 52%, #8b1538 100%);text-align: center;-webkit-font-smoothing: antialiased;}.card {width: min(100%, 22rem);padding: 2rem 1.5rem;border-radius: 1.25rem;background: rgba(255, 255, 255, 0.06);border: 1px solid rgba(255, 255, 255, 0.12);backdrop-filter: blur(12px);box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);}.logo {width: 4.5rem;height: 4.5rem;margin: 0 auto 1.25rem;border-radius: 1rem;box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);}.brand {font-size: 0.75rem;font-weight: 700;letter-spacing: 0.14em;text-transform: uppercase;color: rgba(255, 255, 255, 0.65);margin: 0 0 0.5rem;}h1 {font-size: 1.35rem;font-weight: 700;line-height: 1.3;margin: 0 0 0.75rem;}p {margin: 0;font-size: 0.95rem;line-height: 1.55;color: rgba(255, 255, 255, 0.78);}.hint {margin-top: 0.65rem;font-size: 0.85rem;color: rgba(255, 255, 255, 0.55);}button {margin-top: 1.5rem;width: 100%;padding: 0.85rem 1rem;font-size: 0.95rem;font-weight: 600;border: none;border-radius: 0.75rem;background: #c41e3a;color: #fff;cursor: pointer;transition: transform 0.15s ease, background 0.15s ease;}button:active { transform: scale(0.98); }button:hover { background: #d62839; }.pulse {display: inline-block;width: 0.5rem;height: 0.5rem;margin-right: 0.35rem;border-radius: 50%;background: #4ade80;vertical-align: middle;animation: pulse 1.6s ease-in-out infinite;}@keyframes pulse {0%, 100% { opacity: 0.35; transform: scale(0.9); }50% { opacity: 1; transform: scale(1); }}</style></head><body><div class="card"><img class="logo" src="/icons/icon-192.png" width="72" height="72" alt=""><p class="brand">Wab-infos</p><h1>Service momentanément indisponible</h1><p>Maintenance en cours ou serveur inaccessible. L'équipe travaille au rétablissement du service.</p><p class="hint">Vérifiez aussi votre connexion internet si le problème persiste.</p><button type="button" id="retry">Réessayer</button></div><script>document.getElementById('retry').addEventListener('click', function () { location.reload(); });setInterval(function () {fetch('/', { method: 'HEAD', cache: 'no-store' }).then(function (r) { if (r.ok || r.type === 'opaque') location.reload(); }).catch(function () {});}, 30000);</script></body></html>`;

const SERVER_DOWN_STATUSES = new Set([502, 503, 504]);

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
          .filter((key) => key.startsWith('wab-site-offline-') && key !== OFFLINE_CACHE)
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

/** UI Wab-infos (200) — évite la page brute « 503 Service Unavailable » du navigateur. */
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
  if (event.request.method !== 'GET') return;

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

self.FCM_NOTIFICATION_TAG = 'wab-article-notification';
self.FCM_DEFAULT_URL = '/';
importScripts('/fcm-background.js');

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
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
