/** Pont JS injecté par l’APK reader / rédaction (`window.AndroidBridge`). */

export type AndroidWebViewPushPermission = 'granted' | 'denied' | 'prompt';

export type AndroidWebViewBridge = {
  getAppVersionJson?: () => string;
  downloadAndInstallApkUpdate?: (url: string) => void;
  showToast?: (message: string) => void;
  isInstalledFromPlayStore?: () => boolean;
  checkForAppUpdate?: () => void;
  share?: (title: string, text: string, url: string) => void;
  /** Affiche le sélecteur Android « Enregistrer sous… » pour un fichier Base64. */
  saveFile?: (base64: string, fileName: string, mimeType: string) => void;
  /** Ouvre la boîte d’impression Android pour le contenu courant de la WebView. */
  printPage?: () => void;
  /** Statut push : granted | denied | prompt */
  getPushPermissionStatus?: () => string;
  areNotificationsEnabled?: () => boolean;
  requestPushPermission?: () => void;
  setPushAlertsEnabled?: (enabled: boolean) => void;
  /** Demande le token FCM natif → event `wab-android-fcm-token`. */
  requestFcmToken?: () => void;
};

export type AndroidWebViewFcmResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason: 'unsupported' | 'denied' | 'invalid_token' | 'server_error';
      message?: string;
    };

export function getAndroidWebViewBridge(): AndroidWebViewBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { AndroidBridge?: AndroidWebViewBridge }).AndroidBridge;
}

/** Envoie un Blob au sélecteur Android « Enregistrer sous… » de l’APK WebView. */
export async function saveBlobToAndroid(blob: Blob, fileName: string, mimeType = blob.type || 'application/octet-stream'): Promise<boolean> {
  const bridge = getAndroidWebViewBridge();
  if (!bridge?.saveFile) return false;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Le fichier dépasse la taille maximale de 25 Mo.');
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  bridge.saveFile(btoa(binary), fileName, mimeType);
  return true;
}

export function printPageWithAndroidBridge(): boolean {
  const bridge = getAndroidWebViewBridge();
  if (!bridge?.printPage) return false;
  bridge.printPage();
  return true;
}

export function hasAndroidWebViewPushBridge(): boolean {
  const bridge = getAndroidWebViewBridge();
  return Boolean(bridge?.getPushPermissionStatus && bridge?.requestPushPermission);
}

export function hasAndroidWebViewFcmTokenBridge(): boolean {
  return Boolean(getAndroidWebViewBridge()?.requestFcmToken);
}

export function getAndroidWebViewPushPermission(): AndroidWebViewPushPermission | null {
  const bridge = getAndroidWebViewBridge();
  if (!bridge?.getPushPermissionStatus) {
    if (bridge?.areNotificationsEnabled) {
      return bridge.areNotificationsEnabled() ? 'granted' : 'prompt';
    }
    return null;
  }
  const raw = String(bridge.getPushPermissionStatus() || '').trim().toLowerCase();
  if (raw === 'granted' || raw === 'denied' || raw === 'prompt') return raw;
  return 'prompt';
}

const PERMISSION_EVENT = 'wab-android-push-permission';
const FCM_TOKEN_EVENT = 'wab-android-fcm-token';

function waitForAndroidPushPermission(timeoutMs = 60_000): Promise<boolean> {
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
      finish(getAndroidWebViewPushPermission() === 'granted');
    }, timeoutMs);

    window.addEventListener(PERMISSION_EVENT, onEvent as EventListener);
  });
}

function waitForAndroidFcmToken(timeoutMs = 20_000): Promise<{ token?: string; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload: { token?: string; error?: string }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener(FCM_TOKEN_EVENT, onEvent as EventListener);
      resolve(payload);
    };

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ token?: string; error?: string }>).detail || {};
      finish(detail);
    };

    const timer = window.setTimeout(() => {
      finish({ error: 'Délai dépassé en attendant le token FCM natif.' });
    }, timeoutMs);

    window.addEventListener(FCM_TOKEN_EVENT, onEvent as EventListener);
  });
}

/**
 * Permission + token FCM via l’APK WebView native (lecteur / rédaction).
 * Le caller doit poster le token vers son endpoint subscribe.
 */
export async function requestAndroidWebViewFcmToken(): Promise<AndroidWebViewFcmResult> {
  const bridge = getAndroidWebViewBridge();
  if (!bridge) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Pont Android indisponible. Réinstallez l’APK Wab Rédaction.',
    };
  }

  if (!bridge.requestFcmToken) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Cette version de l’APK ne gère pas encore le push rédaction. Mettez à jour (v1.0.10+).',
    };
  }

  const permission = getAndroidWebViewPushPermission();
  if (permission !== 'granted') {
    if (permission === 'denied' && !bridge.requestPushPermission) {
      return {
        ok: false,
        reason: 'denied',
        message: 'Notifications bloquées dans les paramètres Android.',
      };
    }
    const grantedPromise = waitForAndroidPushPermission();
    try {
      bridge.requestPushPermission?.();
    } catch (error) {
      return {
        ok: false,
        reason: 'server_error',
        message: error instanceof Error ? error.message : 'Impossible de demander la permission.',
      };
    }
    const granted = await grantedPromise;
    if (!granted) {
      return {
        ok: false,
        reason: 'denied',
        message:
          'Notifications refusées. Autorisez-les dans Paramètres → Applications → Wab Rédaction.',
      };
    }
  }

  const tokenPromise = waitForAndroidFcmToken();
  try {
    bridge.requestFcmToken();
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid_token',
      message: error instanceof Error ? error.message : 'Impossible de demander le token FCM.',
    };
  }

  const { token, error } = await tokenPromise;
  if (!token || token.length < 20) {
    const raw = error || 'Token FCM natif indisponible.';
    const friendly = /FIS_AUTH_ERROR|clé API \/ SHA/i.test(raw)
      ? 'Firebase refuse l’app (clé API Google Cloud restreinte). Ajoutez le package com.wabinfos.redaction + SHA-1 du keystore aux restrictions Android de la clé, puis désinstallez et réinstallez l’APK.'
      : raw;
    return {
      ok: false,
      reason: 'invalid_token',
      message: friendly,
    };
  }

  try {
    bridge.setPushAlertsEnabled?.(true);
  } catch {
    // ignore
  }

  return { ok: true, token };
}
