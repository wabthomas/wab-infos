export const APK_SNOOZE_MS = 24 * 60 * 60 * 1000;
export const APK_INSTALL_WAIT_MS = 60 * 60 * 1000;

/** Une mise à jour différée revient le lendemain, une installation lancée après une heure si elle a échoué. */
export function isApkBannerTemporarilyHidden(
  remoteCode: number,
  stored: string | null,
  duration: number,
  now = Date.now()
): boolean {
  if (!stored || !Number.isSafeInteger(remoteCode) || remoteCode <= 0) return false;
  try {
    const data = JSON.parse(stored) as { versionCode?: unknown; at?: unknown };
    return data.versionCode === remoteCode && typeof data.at === 'number' &&
      Number.isFinite(data.at) && data.at <= now && now - data.at < duration;
  } catch { return false; }
}

export function apkBannerStamp(versionCode: number, at = Date.now()): string {
  return JSON.stringify({ versionCode, at });
}
