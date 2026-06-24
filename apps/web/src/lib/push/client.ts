import { registerSiteServiceWorker } from '@/lib/pwa/register-site-sw';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function waitForServiceWorker(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const existing = await registerSiteServiceWorker();
  if (existing?.active) return existing;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    navigator.serviceWorker.ready
      .then((registration) => {
        clearTimeout(timer);
        resolve(registration);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

export async function subscribeToPushNotifications(): Promise<{
  ok: true;
} | {
  ok: false;
  reason: 'unsupported' | 'denied' | 'vapid_missing' | 'sw_unavailable' | 'invalid_subscription' | 'server_error';
  message?: string;
}> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  const registration = await waitForServiceWorker();
  if (!registration) {
    return { ok: false, reason: 'sw_unavailable' };
  }

  const keyRes = await fetch('/api/push/vapid-key');
  if (!keyRes.ok) {
    return { ok: false, reason: 'vapid_missing' };
  }

  const { publicKey } = (await keyRes.json()) as { publicKey?: string };
  if (!publicKey) {
    return { ok: false, reason: 'vapid_missing' };
  }

  const applicationServerKey = urlBase64ToUint8Array(publicKey) as BufferSource;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch {
      const stale = await registration.pushManager.getSubscription();
      if (stale) await stale.unsubscribe().catch(() => undefined);

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch {
        return { ok: false, reason: 'invalid_subscription' };
      }
    }
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'invalid_subscription' };
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      reason: 'server_error',
      message: data.error,
    };
  }

  return { ok: true };
}

export async function syncPushSubscriptionIfGranted(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false;
  }

  const registration = await waitForServiceWorker(4000);
  if (!registration) return false;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    }),
  });

  return res.ok;
}
