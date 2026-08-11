'use client';

import {
  getCapacitorPushPermission,
  initCapacitorPush,
  isNativeCapacitorApp,
  isNativeCapacitorFromUserAgent,
  subscribeViaCapacitorPush as subscribeCapacitorPush,
  syncCapacitorPushIfGranted as syncCapacitorPush,
  type NativePushResult,
} from '@wab-infos/shared';

export type { NativePushResult };
export { getCapacitorPushPermission, isNativeCapacitorApp, isNativeCapacitorFromUserAgent };

import { redactionPublicPath } from '@/lib/redaction/public-path';

function editorSubscribePath(): string {
  return redactionPublicPath('/api/redaction/push/subscribe');
}

export async function setupCapacitorPushListeners(): Promise<void> {
  await initCapacitorPush({
    subscribePath: editorSubscribePath(),
    platform: 'android',
  });
}

export async function subscribeEditorViaCapacitorPush(): Promise<NativePushResult> {
  return subscribeCapacitorPush({
    subscribePath: editorSubscribePath(),
    platform: 'android',
  });
}

export async function syncEditorCapacitorPushIfGranted(): Promise<boolean> {
  return syncCapacitorPush({
    subscribePath: editorSubscribePath(),
    platform: 'android',
  });
}
