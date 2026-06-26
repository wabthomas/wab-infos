'use client';

import {
  getCapacitorPushPermission,
  isNativeCapacitorApp,
  setupCapacitorPushListeners,
  subscribeViaCapacitorPush as subscribeCapacitorPush,
  syncCapacitorPushIfGranted as syncCapacitorPush,
  type NativePushResult,
} from '@wab-infos/shared';

export type { NativePushResult };
export { getCapacitorPushPermission, isNativeCapacitorApp, setupCapacitorPushListeners };

const EDITOR_SUBSCRIBE_PATH = '/api/redaction/push/subscribe';

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
