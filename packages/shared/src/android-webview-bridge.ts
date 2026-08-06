/** Pont JS injecté par l’APK reader (`window.AndroidBridge`). */

export type AndroidWebViewPushPermission = 'granted' | 'denied' | 'prompt';

export type AndroidWebViewBridge = {
  getAppVersionJson?: () => string;
  downloadAndInstallApkUpdate?: (url: string) => void;
  showToast?: (message: string) => void;
  isInstalledFromPlayStore?: () => boolean;
  checkForAppUpdate?: () => void;
  share?: (title: string, text: string, url: string) => void;
  /** Statut push : granted | denied | prompt */
  getPushPermissionStatus?: () => string;
  areNotificationsEnabled?: () => boolean;
  requestPushPermission?: () => void;
  setPushAlertsEnabled?: (enabled: boolean) => void;
};

export function getAndroidWebViewBridge(): AndroidWebViewBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { AndroidBridge?: AndroidWebViewBridge }).AndroidBridge;
}

export function hasAndroidWebViewPushBridge(): boolean {
  const bridge = getAndroidWebViewBridge();
  return Boolean(bridge?.getPushPermissionStatus && bridge?.requestPushPermission);
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
