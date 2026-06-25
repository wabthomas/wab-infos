'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { getFirebaseClientConfig, getFirebaseVapidKey } from '@/lib/firebase/config';

let messagingInstance: Messaging | null = null;

function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebaseClientConfig();
  if (!config) return null;
  return getApps().length ? getApps()[0]! : initializeApp(config);
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!(await isSupported())) return null;

  if (messagingInstance) return messagingInstance;

  const app = getFirebaseApp();
  if (!app) return null;

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestFcmToken(
  serviceWorkerRegistration: ServiceWorkerRegistration
): Promise<string | null> {
  const messaging = await getFirebaseMessaging();
  const vapidKey = getFirebaseVapidKey();
  if (!messaging || !vapidKey) return null;

  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
}

export function isFirebaseClientConfigured(): boolean {
  return Boolean(getFirebaseClientConfig() && getFirebaseVapidKey());
}
