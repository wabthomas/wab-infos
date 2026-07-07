import { registerSiteServiceWorker } from '@/lib/pwa/register-site-sw';
import {
  isNativeCapacitorApp,
  subscribeViaCapacitorPush,
  syncCapacitorPushIfGranted,
} from '@/lib/push/capacitor-native';
import { isFirebaseClientConfigured, requestFcmToken } from '@/lib/firebase/client';

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
  reason: 'unsupported' | 'denied' | 'firebase_missing' | 'sw_unavailable' | 'invalid_token' | 'server_error';
  message?: string;
}> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  if (await isNativeCapacitorApp()) {
    const native = await subscribeViaCapacitorPush();
    if (!native.ok) {
      return {
        ok: false,
        reason:
          native.reason === 'denied'
            ? 'denied'
            : native.reason === 'unsupported'
              ? 'unsupported'
              : native.reason === 'server_error'
                ? 'server_error'
                : 'invalid_token',
        message: native.message,
      };
    }
    return { ok: true };
  }

  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  if (!(await isFirebaseClientConfigured())) {
    return { ok: false, reason: 'firebase_missing' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  const registration = await waitForServiceWorker();
  if (!registration) {
    return { ok: false, reason: 'sw_unavailable' };
  }

  const tokenResult = await requestFcmToken(registration);
  if (!tokenResult.ok) {
    return {
      ok: false,
      reason: 'invalid_token',
      message: tokenResult.message,
    };
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken: tokenResult.token }),
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
  if (typeof window === 'undefined') return false;

  if (await isNativeCapacitorApp()) {
    return syncCapacitorPushIfGranted();
  }

  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return false;
  }

  if (!(await isFirebaseClientConfigured())) {
    return false;
  }

  const registration = await waitForServiceWorker(4000);
  if (!registration) return false;

  const tokenResult = await requestFcmToken(registration);
  if (!tokenResult.ok) return false;

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken: tokenResult.token }),
  });

  return res.ok;
}
