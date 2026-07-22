const OFFLINE_CACHE = 'wab-site-offline-v4';
const OFFLINE_URL = '/offline.html';

/** Fallback si le cache SW n'est pas encore prêt (garder aligné avec public/offline.html). */
const OFFLINE_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0c0c0f"><title>Hors ligne — Wab-infos</title><style>*, *::before, *::after { box-sizing: border-box; }html, body { height: 100%; margin: 0; }body {font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;display: flex;align-items: center;justify-content: center;padding: max(1.5rem, env(safe-area-inset-top)) 1.25rem max(1.5rem, env(safe-area-inset-bottom));color: #f4f4f5;background:radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196, 30, 58, 0.28), transparent 55%),linear-gradient(145deg, #0c0c0f 0%, #1a2332 48%, #3d1520 100%);text-align: center;-webkit-font-smoothing: antialiased;}.card {width: min(100%, 22rem);padding: 2rem 1.5rem 1.75rem;border-radius: 1.75rem;background: rgba(255, 255, 255, 0.07);border: 1px solid rgba(255, 255, 255, 0.12);backdrop-filter: blur(16px);box-shadow: 0 28px 56px rgba(0, 0, 0, 0.4);animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;}@keyframes rise {from { opacity: 0; transform: translateY(14px) scale(0.98); }to { opacity: 1; transform: none; }}.icon-wrap {width: 4.5rem;height: 4.5rem;margin: 0 auto 1rem;border-radius: 1.35rem;display: grid;place-items: center;background: rgba(255, 255, 255, 0.1);}.icon-wrap svg { width: 2.25rem; height: 2.25rem; }.logo {width: 3.75rem;height: 3.75rem;margin: 0 auto 1rem;border-radius: 1rem;box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);}.brand {font-size: 0.7rem;font-weight: 700;letter-spacing: 0.16em;text-transform: uppercase;color: rgba(255, 255, 255, 0.62);margin: 0 0 0.65rem;}h1 {font-size: 1.45rem;font-weight: 700;line-height: 1.25;margin: 0 0 0.75rem;letter-spacing: -0.02em;}p {margin: 0;font-size: 0.95rem;line-height: 1.55;color: rgba(255, 255, 255, 0.78);}.hint {margin-top: 0.7rem;font-size: 0.85rem;color: rgba(255, 255, 255, 0.52);}button {margin-top: 1.5rem;width: 100%;padding: 0.9rem 1rem;font-size: 0.95rem;font-weight: 650;border: none;border-radius: 1rem;background: #c41e3a;color: #fff;cursor: pointer;transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;box-shadow: 0 10px 24px rgba(196, 30, 58, 0.35);}button:active { transform: scale(0.98); }button:hover { background: #d62839; }.tagline {margin-top: 1.35rem;font-size: 0.78rem;color: rgba(255, 255, 255, 0.45);}</style></head><body><div><div class="card"><div class="icon-wrap" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" fill="rgba(255,255,255,0.9)"/><path d="M3.27 3L2 4.27l2.25 2.25C2.79 7.57 1.34 8.55 0 9.63l2 2c1.05-.85 2.21-1.53 3.44-2.03L17.73 21 19 19.73 3.27 3z" fill="#c41e3a"/></svg></div><img class="logo" src="/icons/icon-192.png" width="60" height="60" alt=""><p class="brand">Wab-infos</p><h1>Vous êtes hors ligne</h1><p>Impossible de charger l’actualité pour le moment. Vérifiez votre Wi‑Fi ou vos données mobiles, puis réessayez.</p><p class="hint">Dès que la connexion revient, appuyez sur Réessayer.</p><button type="button" id="retry">Réessayer</button></div><p class="tagline">S’informer pour mieux s’armer !</p></div><script>document.getElementById('retry').addEventListener('click', function () { location.reload(); });setInterval(function () {fetch('/', { method: 'HEAD', cache: 'no-store' }).then(function (r) { if (r.ok || r.type === 'opaque') location.reload(); }).catch(function () {});}, 30000);</script></body></html>`;

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

  // Ne pas intercepter les API / assets Firebase — évite « Failed to fetch » via Response.error()
  try {
    const url = new URL(event.request.url);
    if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
      return;
    }
  } catch {
    // ignore
  }

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

// FCM en dernier — un échec ne doit pas empêcher offline / fetch / notifications click
self.FCM_NOTIFICATION_TAG = 'wab-article-notification';
self.FCM_DEFAULT_URL = '/';
try {
  importScripts('/fcm-background.js');
} catch (error) {
  console.error('[sw] FCM indisponible', error);
}
