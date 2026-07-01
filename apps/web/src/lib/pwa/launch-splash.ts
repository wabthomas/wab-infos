import { isNativeCapacitorFromUserAgent as isNativeFromUa, NATIVE_APP_UA_MARKER } from '@wab-infos/shared';

export { NATIVE_APP_UA_MARKER, isNativeFromUa as isNativeCapacitorFromUserAgent };
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function shouldShowLaunchSplashSync(): boolean {
  return isStandalonePwa() || isNativeFromUa();
}

export function waitForPageReady(timeoutMs: number): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => resolve();
    window.addEventListener('load', finish, { once: true });
    window.setTimeout(finish, timeoutMs);
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function hideNativeSplashScreen(fadeOutDuration = 350): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isNativeFromUa()) return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration });
    const { configureNativeAndroidStatusBar } = await import('@/lib/pwa/native-status-bar');
    await configureNativeAndroidStatusBar();
  } catch {
    // plugin optionnel côté web
  }
}
