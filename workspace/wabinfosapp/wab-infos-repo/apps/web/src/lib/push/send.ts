import { deleteReaderPushSubscription, listReaderPushSubscriptions } from '@/lib/push/subscriptions';
import {
  ensureFirebaseAdmin,
  isInvalidFcmTokenError,
  sendFcmToToken,
  type FcmNotificationPayload,
} from '@/lib/firebase/admin';
import { isFirebaseAdminConfigured } from '@/lib/firebase/config';

export type PushNotificationPayload = FcmNotificationPayload;

export async function sendPushToReaders(
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  if (!isFirebaseAdminConfigured() || !ensureFirebaseAdmin()) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await listReaderPushSubscriptions();
  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      if (!sub.fcmToken) {
        failed++;
        return;
      }

      try {
        await sendFcmToToken(sub.fcmToken, payload);
        sent++;
      } catch (err: unknown) {
        failed++;
        if (isInvalidFcmTokenError(err)) {
          await deleteReaderPushSubscription(sub.documentId).catch(() => undefined);
        }
      }
    })
  );

  return { sent, failed };
}
