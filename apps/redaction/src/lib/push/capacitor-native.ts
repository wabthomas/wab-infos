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

const EDITOR_SUBSCRIBE_PATH = '/api/redaction/push/subscribe';

export async function setupCapacitorPushListeners(): Promise<void> {
  await initCapacitorPush({
    subscribePath: EDITOR_SUBSCRIBE_PATH,
    platform: 'android',
  });
}

export async function subscribeEditorViaCapacitorPush(): Promise<NativePushResult> {
  return subscribeCapacitorPush({
    subscribePath: EDITOR_SUBSCRIBE_PATH,
    platform: 'android',
  });
}

export async function syncEditorCapacitorPushIfGranted(): Promise<boolean> {
  return syncCapacitorPush({
    subscribePath: EDITOR_SUBSCRIBE_PATH,
    platform: 'android',
  });
}
