import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isNativeCapacitorFromUserAgent } from './capacitor-detect';

export type InstalledAppVersion = {
  versionCode: number;
  versionName: string;
};

export type RemoteApkVersion = {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseNotes?: string;
  releasedAt?: string;
};

export type AppUpdateCheckResult = {
  updateAvailable: boolean;
  installed: InstalledAppVersion | null;
  remote: RemoteApkVersion | null;
  apkDownloadUrl: string | null;
};

interface AppUpdatePlugin {
  getAppVersion(): Promise<InstalledAppVersion>;
  downloadAndInstall(options: { url: string }): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (event: { progress: number }) => void
  ): Promise<PluginListenerHandle>;
}

let appUpdatePlugin: AppUpdatePlugin | null = null;

function getAppUpdatePlugin(): AppUpdatePlugin {
  if (!appUpdatePlugin) {
    appUpdatePlugin = registerPlugin<AppUpdatePlugin>('AppUpdate');
  }
  return appUpdatePlugin;
}

const APK_UPDATE_DISMISS_KEY = 'wab-apk-update-dismissed-code';

export function resolveApkAssetUrl(baseUrl: string, assetPath: string): string {
  const base = baseUrl.replace(/\/$/, '');
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${base}${path}`;
}

export async function getInstalledAppVersion(): Promise<InstalledAppVersion | null> {
  if (!isNativeCapacitorFromUserAgent()) return null;
  try {
    return await getAppUpdatePlugin().getAppVersion();
  } catch {
    return null;
  }
}

export async function fetchRemoteApkVersion(versionUrl: string): Promise<RemoteApkVersion | null> {
  try {
    const res = await fetch(versionUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<RemoteApkVersion>;
    if (typeof data.versionCode !== 'number' || !data.apkUrl) return null;
    return {
      versionCode: data.versionCode,
      versionName: data.versionName ?? String(data.versionCode),
      apkUrl: data.apkUrl,
      releaseNotes: data.releaseNotes,
      releasedAt: data.releasedAt,
    };
  } catch {
    return null;
  }
}

export function isApkUpdateDismissed(versionCode: number): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(APK_UPDATE_DISMISS_KEY) === String(versionCode);
}

export function dismissApkUpdate(versionCode: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(APK_UPDATE_DISMISS_KEY, String(versionCode));
}

export async function checkForApkUpdate(options: {
  siteUrl: string;
  versionManifestUrl: string;
}): Promise<AppUpdateCheckResult> {
  const installed = await getInstalledAppVersion();
  const manifestUrl = resolveApkAssetUrl(options.siteUrl, options.versionManifestUrl);
  const remote = await fetchRemoteApkVersion(manifestUrl);

  if (!installed || !remote) {
    return {
      updateAvailable: false,
      installed,
      remote,
      apkDownloadUrl: null,
    };
  }

  const apkDownloadUrl = resolveApkAssetUrl(options.siteUrl, remote.apkUrl);
  const updateAvailable = remote.versionCode > installed.versionCode;

  return {
    updateAvailable,
    installed,
    remote,
    apkDownloadUrl,
  };
}

export async function downloadAndInstallApkUpdate(
  apkUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  let listener: PluginListenerHandle | undefined;
  if (onProgress) {
    listener = await getAppUpdatePlugin().addListener('downloadProgress', (event) => {
      onProgress(event.progress);
    });
  }

  try {
    await getAppUpdatePlugin().downloadAndInstall({ url: apkUrl });
  } finally {
    await listener?.remove();
  }
}
