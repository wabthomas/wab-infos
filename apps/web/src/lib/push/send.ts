import { deleteReaderPushSubscription, listReaderPushSubscriptions } from '@/lib/push/subscriptions';
import { ensureWebPushConfigured, webpush } from '@/lib/push/vapid';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
}

export async function sendPushToReaders(
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureWebPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await listReaderPushSubscriptions();
  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url.startsWith('http') ? payload.url : `${siteUrl}${payload.url}`,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await deleteReaderPushSubscription(sub.documentId).catch(() => undefined);
        }
      }
    })
  );

  return { sent, failed };
}
