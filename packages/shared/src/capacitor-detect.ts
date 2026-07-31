/** Marqueurs user-agent des APK Android (WebView native). */
export const NATIVE_APP_UA_MARKER = 'WabInfosNative';
export const NATIVE_REDACTION_UA_MARKER = 'WabRedactionNative';

const NATIVE_UA_MARKERS = [NATIVE_APP_UA_MARKER, NATIVE_REDACTION_UA_MARKER] as const;

export function isNativeCapacitorFromUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return NATIVE_UA_MARKERS.some((marker) => navigator.userAgent.includes(marker));
}

export function isNativeRedactionAppFromUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes(NATIVE_REDACTION_UA_MARKER);
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
