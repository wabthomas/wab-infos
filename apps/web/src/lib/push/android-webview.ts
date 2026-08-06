'use client';

import {
  getAndroidWebViewBridge,
  getAndroidWebViewPushPermission,
  hasAndroidWebViewPushBridge,
  isNativeCapacitorFromUserAgent,
  type NativePushResult,
} from '@wab-infos/shared';

const PERMISSION_EVENT = 'wab-android-push-permission';

export function isAndroidWebViewReaderApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasAndroidWebViewPushBridge()) return true;
  // Ancienne APK : UA native + bridge sans méthodes push.
  return isNativeCapacitorFromUserAgent() && Boolean(getAndroidWebViewBridge());
}

export function getAndroidReaderPushPermission():
  | 'granted'
  | 'denied'
  | 'prompt'
  | null {
  if (!isAndroidWebViewReaderApp()) return null;
  const status = getAndroidWebViewPushPermission();
  if (status) return status;
  // Ancienne APK sans getPushPermissionStatus : on laisse activer (topics FCM au démarrage).
  return 'prompt';
}

function waitForPermissionResult(timeoutMs = 60_000): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (granted: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener(PERMISSION_EVENT, onEvent as EventListener);
      resolve(granted);
    };

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ granted?: boolean }>).detail;
      finish(Boolean(detail?.granted));
    };

    const timer = window.setTimeout(() => {
      const bridge = getAndroidWebViewBridge();
      if (bridge?.areNotificationsEnabled) {
        finish(Boolean(bridge.areNotificationsEnabled()));
        return;
      }
      const status = getAndroidWebViewPushPermission();
      finish(status === 'granted');
    }, timeoutMs);

    window.addEventListener(PERMISSION_EVENT, onEvent as EventListener);
  });
}

export async function subscribeViaAndroidWebView(): Promise<NativePushResult> {
  if (!isAndroidWebViewReaderApp()) {
    return { ok: false, reason: 'unsupported' };
  }

  const bridge = getAndroidWebViewBridge();
  if (!bridge) {
    return { ok: false, reason: 'unsupported' };
  }

  // Ancienne APK : pas de méthodes push → préférence UI + topics déjà abonnés au boot.
  if (!hasAndroidWebViewPushBridge()) {
    try {
      bridge.setPushAlertsEnabled?.(true);
    } catch {
      // ignore
    }
    return { ok: true };
  }

  const current = getAndroidWebViewPushPermission();
  if (current === 'granted') {
    try {
      bridge.setPushAlertsEnabled?.(true);
    } catch {
      // ignore
    }
    return { ok: true };
  }

  if (current === 'denied' && !bridge.requestPushPermission) {
    return { ok: false, reason: 'denied' };
  }

  const resultPromise = waitForPermissionResult();
  try {
    bridge.requestPushPermission?.();
  } catch (error) {
    return {
      ok: false,
      reason: 'server_error',
      message: error instanceof Error ? error.message : 'Impossible de demander la permission.',
    };
  }

  const granted = await resultPromise;
  if (!granted) {
    return { ok: false, reason: 'denied' };
  }

  try {
    bridge.setPushAlertsEnabled?.(true);
  } catch {
    // ignore
  }
  return { ok: true };
}

export async function syncAndroidWebViewPushIfGranted(): Promise<boolean> {
  if (!isAndroidWebViewReaderApp()) return false;
  const status = getAndroidReaderPushPermission();
  if (status !== 'granted') return false;
  try {
    getAndroidWebViewBridge()?.setPushAlertsEnabled?.(true);
  } catch {
    // ignore
  }
  return true;
}

export function disableAndroidWebViewPush(): void {
  try {
    getAndroidWebViewBridge()?.setPushAlertsEnabled?.(false);
  } catch {
    // ignore
  }
}
