'use client';

import {
  getCapacitorPushPermission,
  initCapacitorPush,
  isNativeCapacitorApp,
  subscribeViaCapacitorPush as subscribeCapacitorPush,
  syncCapacitorPushIfGranted as syncCapacitorPush,
  type NativePushResult,
} from '@wab-infos/shared';

export type { NativePushResult };
export { getCapacitorPushPermission, isNativeCapacitorApp };

const READER_SUBSCRIBE_PATH = '/api/push/subscribe';

export async function setupCapacitorPushListeners(): Promise<void> {
  await initCapacitorPush({
    subscribePath: READER_SUBSCRIBE_PATH,
    platform: 'android',
  });
}

export async function subscribeViaCapacitorPush(): Promise<NativePushResult> {
  return subscribeCapacitorPush({
    subscribePath: READER_SUBSCRIBE_PATH,
    platform: 'android',
  });
}

export async function syncCapacitorPushIfGranted(): Promise<boolean> {
  return syncCapacitorPush({
    subscribePath: READER_SUBSCRIBE_PATH,
    platform: 'android',
  });
}
