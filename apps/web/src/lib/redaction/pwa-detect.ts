/** Détection navigateur / PWA pour l'app rédaction */

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ se présente parfois comme Mac
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/crios|fxios|edgios|opios|mercury/i.test(ua);
}

/** Chrome/Facebook/Instagram in-app : pas d'ajout à l'écran d'accueil fiable */
export function needsSafariForIosInstall(): boolean {
  if (!isIosDevice()) return false;
  if (isIosSafari()) return false;
  const ua = navigator.userAgent;
  return /crios|fxios|edgios|FBAN|FBAV|Instagram|Line\//i.test(ua) || !/safari/i.test(ua);
}
