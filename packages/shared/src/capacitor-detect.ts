/** Doit correspondre à `appendUserAgent` dans apps/reader-android/capacitor.config.ts */
export const NATIVE_APP_UA_MARKER = 'WabInfosNative';

export function isNativeCapacitorFromUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes(NATIVE_APP_UA_MARKER);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}
