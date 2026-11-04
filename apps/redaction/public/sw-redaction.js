const OFFLINE_CACHE = 'redaction-offline-v4';
const OFFLINE_URL = new URL('redaction-offline.html', self.registration.scope).pathname;
const OFFLINE_SCRIPT = new URL('redaction-offline.js', self.registration.scope).pathname;
const VOICE_URLS = ['arrival', 'departure', 'submission', 'arrival-offline', 'departure-offline', 'submission-offline'].map((name) => new URL(`rh-voice/${name}.mp3`, self.registration.scope).pathname);

const OFFLINE_HTML = '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Rédaction hors ligne</title><body><h1>Rédaction hors ligne</h1><p>La page locale est indisponible. Reconnectez-vous et réessayez.</p></body></html>';

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
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([OFFLINE_URL, OFFLINE_SCRIPT, ...VOICE_URLS]))
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

function offlineNavigationResponse(request) {
  if (new URL(request.url).pathname !== OFFLINE_URL) return Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302);
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
    ((event.request.url === new URL(OFFLINE_SCRIPT, self.location.origin).href || VOICE_URLS.includes(new URL(event.request.url).pathname)) ? caches.match(event.request).then((cached) => cached || fetch(event.request)) : fetch(event.request))
      .then((response) => {
        if (shouldServeOfflinePage(event.request, response)) {
          return offlineNavigationResponse(event.request);
        }
        return response;
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return offlineNavigationResponse(event.request);
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
  importScripts('fcm-background.js');
} catch (error) {
  console.error('[sw-redaction] FCM indisponible', error);
}
