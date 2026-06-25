'use client';

import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import {
  getFirebaseClientConfig,
  getFirebaseVapidKey,
  type FirebaseClientConfig,
} from '@/lib/firebase/config';

let cachedConfig: FirebaseClientConfig | null = null;
let cachedVapidKey: string | null = null;
let fetchPromise: Promise<boolean> | null = null;

export type FcmTokenResult =
  | { ok: true; token: string }
  | { ok: false; code: string; message: string };

async function fetchFirebaseConfigFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/push/vapid-key', { cache: 'no-store' });
    if (!res.ok) return false;

    const data = (await res.json()) as FirebaseClientConfig & {
      vapidKey?: string;
      publicKey?: string;
    };

    if (
      !data.apiKey ||
      !data.authDomain ||
      !data.projectId ||
      !data.messagingSenderId ||
      !data.appId
    ) {
      return false;
    }

    cachedConfig = {
      apiKey: data.apiKey,
      authDomain: data.authDomain,
      projectId: data.projectId,
      messagingSenderId: data.messagingSenderId,
      appId: data.appId,
      ...(data.storageBucket ? { storageBucket: data.storageBucket } : {}),
    };
    cachedVapidKey = data.vapidKey || data.publicKey || null;
    return Boolean(cachedVapidKey);
  } catch {
    return false;
  }
}

async function resolveFirebaseClientConfig(): Promise<FirebaseClientConfig | null> {
  const fromEnv = getFirebaseClientConfig();
  if (fromEnv) return fromEnv;
  if (cachedConfig) return cachedConfig;

  if (!fetchPromise) {
    fetchPromise = fetchFirebaseConfigFromServer().finally(() => {
      fetchPromise = null;
    });
  }

  await fetchPromise;
  return cachedConfig;
}

async function resolveVapidKey(): Promise<string | null> {
  const fromEnv = getFirebaseVapidKey();
  if (fromEnv) return fromEnv;
  if (cachedVapidKey) return cachedVapidKey;

  await resolveFirebaseClientConfig();
  return cachedVapidKey;
}

function getOrInitApp(config: FirebaseClientConfig): FirebaseApp {
  const apps = getApps();
  if (!apps.length) return initializeApp(config);

  const app = apps[0]!;
  if (app.options.projectId !== config.projectId) {
    void deleteApp(app).catch(() => undefined);
    return initializeApp(config);
  }
  return app;
}

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'messaging/failed-service-worker-registration':
      return 'Service worker Firebase indisponible. Videz le cache du site et rechargez.';
    case 'messaging/token-subscribe-failed':
      return 'Clé Web Push Firebase invalide. Vérifiez NEXT_PUBLIC_FIREBASE_VAPID_KEY.';
    case 'messaging/permission-blocked':
      return 'Notifications bloquées dans le navigateur.';
    case 'messaging/unsupported-browser':
      return 'Navigateur non compatible avec les notifications push.';
    default:
      return 'Impossible d\'obtenir le token de notification. Réessayez ou videz le cache.';
  }
}

async function prepareServiceWorker(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> {
  await registration.update().catch(() => undefined);

  if (!registration.active) {
    await new Promise<void>((resolve) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) {
        resolve();
        return;
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
      });
    });
  }

  await navigator.serviceWorker.ready;

  // Ancien abonnement VAPID (web-push) incompatible avec FCM
  const stale = await registration.pushManager.getSubscription();
  if (stale) {
    await stale.unsubscribe().catch(() => undefined);
  }

  return registration;
}

export async function isFirebaseClientConfigured(): Promise<boolean> {
  const config = await resolveFirebaseClientConfig();
  const vapidKey = await resolveVapidKey();
  return Boolean(config && vapidKey);
}

export async function requestFcmToken(
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<FcmTokenResult> {
  if (!(await isSupported())) {
    return {
      ok: false,
      code: 'messaging/unsupported-browser',
      message: firebaseErrorMessage('messaging/unsupported-browser'),
    };
  }

  const config = await resolveFirebaseClientConfig();
  const vapidKey = await resolveVapidKey();
  if (!config || !vapidKey) {
    return {
      ok: false,
      code: 'firebase/config-missing',
      message: 'Configuration Firebase indisponible sur le serveur.',
    };
  }

  try {
    const registration = await prepareServiceWorker(serviceWorkerRegistration);
    const app = getOrInitApp(config);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return {
        ok: false,
        code: 'messaging/empty-token',
        message: firebaseErrorMessage('messaging/empty-token'),
      };
    }

    return { ok: true, token };
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : 'messaging/unknown';
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message)
        : firebaseErrorMessage(code);

    console.error('[fcm] getToken failed', code, message);
    return { ok: false, code, message: firebaseErrorMessage(code) || message };
  }
}
