'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import {
  getFirebaseClientConfig,
  getFirebaseVapidKey,
  type FirebaseClientConfig,
} from '@/lib/firebase/config';

let cachedConfig: FirebaseClientConfig | null = null;
let cachedVapidKey: string | null = null;
let fetchPromise: Promise<boolean> | null = null;

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
  return getApps().length ? getApps()[0]! : initializeApp(config);
}

export async function isFirebaseClientConfigured(): Promise<boolean> {
  const config = await resolveFirebaseClientConfig();
  const vapidKey = await resolveVapidKey();
  return Boolean(config && vapidKey);
}

export async function requestFcmToken(
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<string | null> {
  if (!(await isSupported())) return null;

  const config = await resolveFirebaseClientConfig();
  const vapidKey = await resolveVapidKey();
  if (!config || !vapidKey) return null;

  const app = getOrInitApp(config);
  const messaging: Messaging = getMessaging(app);

  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
}
