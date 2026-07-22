'use client';

import {
  getCapacitorPushPermission,
  initCapacitorPush,
  isNativeCapacitorApp,
  resolvePublicHttpsUrl,
  subscribeViaCapacitorPush as subscribeCapacitorPush,
  syncCapacitorPushIfGranted as syncCapacitorPush,
  type NativePushResult,
} from '@wab-infos/shared';
import { siteConfig } from '@/config/site';

export type { NativePushResult };
export { getCapacitorPushPermission, isNativeCapacitorApp };

/** URL absolue : en WebView Capacitor, un chemin relatif ne joint pas le site. */
function readerSubscribeUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    return `${window.location.origin}/api/push/subscribe`;
  }
  const base = resolvePublicHttpsUrl(siteConfig.url, 'https://wab-infos.com');
  return `${base}/api/push/subscribe`;
}

export async function setupCapacitorPushListeners(): Promise<void> {
  await initCapacitorPush({
    subscribePath: readerSubscribeUrl(),
    platform: 'android',
  });
}

export async function subscribeViaCapacitorPush(): Promise<NativePushResult> {
  return subscribeCapacitorPush({
    subscribePath: readerSubscribeUrl(),
    platform: 'android',
  });
}

export async function syncCapacitorPushIfGranted(): Promise<boolean> {
  return syncCapacitorPush({
    subscribePath: readerSubscribeUrl(),
    platform: 'android',
  });
}
