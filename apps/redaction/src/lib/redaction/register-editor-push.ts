'use client';

import {
  registerRedactionServiceWorker,
} from '@/lib/redaction/register-service-worker';
import { fetchRedaction, getRedactionServiceWorkerScope } from '@/lib/redaction/public-path';
import { isFirebaseClientConfigured, requestFcmToken, setupForegroundFcmListener } from '@/lib/firebase/client';
import {
  getAndroidWebViewBridge,
  getAndroidWebViewPushPermission,
  isNativeCapacitorFromUserAgent,
  requestAndroidWebViewFcmToken,
} from '@wab-infos/shared';
import {
  getCapacitorPushPermission,
  isNativeCapacitorApp,
  subscribeEditorViaCapacitorPush,
} from '@/lib/push/capacitor-native';

const PUSH_OPT_OUT_KEY = 'redaction-push-opt-out';

export type RegisterEditorPushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'config' | 'register'; message: string };

export function isEditorPushOptedOut(): boolean {
  try {
    return localStorage.getItem(PUSH_OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setEditorPushOptOut(optedOut: boolean): void {
  try {
    if (optedOut) localStorage.setItem(PUSH_OPT_OUT_KEY, '1');
    else localStorage.removeItem(PUSH_OPT_OUT_KEY);
  } catch {
    // ignore quota / private mode
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function postEditorFcmToken(fcmToken: string): Promise<RegisterEditorPushResult> {
  const res = await fetchRedaction('/api/redaction/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcmToken }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      reason: 'register',
      message: data.error ?? 'Enregistrement impossible.',
    };
  }

  return { ok: true };
}

async function registerAndroidWebViewPush(): Promise<RegisterEditorPushResult> {
  const native = await requestAndroidWebViewFcmToken();
  if (!native.ok) {
    return {
      ok: false,
      reason: native.reason === 'denied' ? 'denied' : 'register',
      message: native.message ?? 'Activation impossible sur l’APK.',
    };
  }
  return postEditorFcmToken(native.token);
}

async function registerWebPushSubscription(): Promise<RegisterEditorPushResult> {
  if (!('serviceWorker' in navigator) || !(await isFirebaseClientConfigured())) {
    return {
      ok: false,
      reason: 'config',
      message: 'Notifications non configurées sur ce serveur.',
    };
  }

  if (!('Notification' in window)) {
    return { ok: false, reason: 'unsupported', message: 'Navigateur incompatible.' };
  }

  if (Notification.permission === 'denied') {
    return {
      ok: false,
      reason: 'denied',
      message: 'Notifications bloquées — autorisez-les dans les paramètres du navigateur.',
    };
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        reason: permission === 'denied' ? 'denied' : 'register',
        message: 'Autorisation refusée.',
      };
    }
  }

  const registration =
    (await navigator.serviceWorker.getRegistration(getRedactionServiceWorkerScope())) ||
    (await registerRedactionServiceWorker());
  if (!registration) {
    return {
      ok: false,
      reason: 'register',
      message: 'Service worker indisponible. Videz le cache et réessayez.',
    };
  }

  try {
    await withTimeout(
      navigator.serviceWorker.ready,
      12_000,
      'Service worker trop long à démarrer. Videz le cache du site et réessayez.'
    );
  } catch (err) {
    return {
      ok: false,
      reason: 'register',
      message: err instanceof Error ? err.message : 'Service worker indisponible.',
    };
  }

  let tokenResult: Awaited<ReturnType<typeof requestFcmToken>>;
  try {
    tokenResult = await withTimeout(
      requestFcmToken(registration),
      20_000,
      'Délai dépassé lors de l’obtention du token Firebase. Videz le cache et réessayez.'
    );
  } catch (err) {
    return {
      ok: false,
      reason: 'register',
      message: err instanceof Error ? err.message : 'Token Firebase indisponible.',
    };
  }

  if (!tokenResult.ok) {
    return {
      ok: false,
      reason: tokenResult.code.includes('permission') ? 'denied' : 'register',
      message: tokenResult.message,
    };
  }

  const saved = await postEditorFcmToken(tokenResult.token);
  if (saved.ok) {
    void setupForegroundFcmListener();
  }
  return saved;
}

function isAndroidWebViewEditorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(getAndroidWebViewBridge()) || isNativeCapacitorFromUserAgent();
}

export async function registerEditorPushSubscription(): Promise<RegisterEditorPushResult> {
  // APK rédaction = WebView native (AndroidBridge), pas Capacitor.
  if (isNativeCapacitorFromUserAgent() || getAndroidWebViewBridge()) {
    if (!getAndroidWebViewBridge()) {
      return {
        ok: false,
        reason: 'register',
        message: 'Pont Android indisponible. Fermez et rouvrez l’APK, ou mettez à jour (v1.0.10+).',
      };
    }
    return registerAndroidWebViewPush();
  }

  if (await isNativeCapacitorApp()) {
    const result = await subscribeEditorViaCapacitorPush();
    if (!result.ok) {
      const fallback =
        result.reason === 'denied'
          ? 'Notifications refusées. Autorisez-les dans les paramètres Android de Wab Rédaction.'
          : result.reason === 'unsupported'
            ? 'Push non disponible sur cette version de l’APK. Mettez à jour l’application.'
            : result.reason === 'invalid_token'
              ? 'Firebase Android non initialisé. Réinstallez l’APK rédaction.'
              : 'Activation impossible.';
      return {
        ok: false,
        reason: result.reason === 'denied' ? 'denied' : 'register',
        message: result.message?.trim() || fallback,
      };
    }
    return { ok: true };
  }

  return registerWebPushSubscription();
}

export async function getLocalPushPermission(): Promise<
  'granted' | 'denied' | 'default' | 'unsupported'
> {
  if (getAndroidWebViewBridge()) {
    const p = getAndroidWebViewPushPermission();
    if (p === 'granted' || p === 'denied') return p;
    return 'default';
  }

  if (isNativeCapacitorFromUserAgent() || (await isNativeCapacitorApp())) {
    const p = await getCapacitorPushPermission();
    if (p === 'granted' || p === 'denied') return p;
    return 'default';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
