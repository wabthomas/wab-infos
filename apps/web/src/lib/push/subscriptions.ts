import { fcmTokenKey, isDuplicateFcmTokenError } from '@/lib/push/fcm-token-key';
import { strapiAdminFetch } from '@/lib/push/strapi-admin';

interface StoredReaderSubscription {
  documentId: string;
  fcmToken: string;
  fcmTokenKey?: string;
  userAgent?: string;
}

interface ReaderSubscriptionListResponse {
  data: StoredReaderSubscription[];
  meta?: { pagination?: { pageCount?: number } };
}

async function findReaderSubscriptionByToken(
  fcmToken: string
): Promise<StoredReaderSubscription | null> {
  const tokenKey = fcmTokenKey(fcmToken);

  const byKey = await strapiAdminFetch<ReaderSubscriptionListResponse>(
    '/reader-push-subscriptions',
    {
      filters: { fcmTokenKey: { $eq: tokenKey } },
      pagination: { pageSize: 1 },
    }
  );
  if (byKey.data[0]) return byKey.data[0];

  let page = 1;
  const pageSize = 100;

  for (;;) {
    const batch = await strapiAdminFetch<ReaderSubscriptionListResponse>(
      '/reader-push-subscriptions',
      { pagination: { page, pageSize } }
    );

    const match = batch.data.find((row) => row.fcmToken === fcmToken);
    if (match) return match;

    const pageCount = batch.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount || page >= 50) break;
    page++;
  }

  return null;
}

async function updateReaderSubscription(
  documentId: string,
  data: Record<string, unknown>
): Promise<void> {
  await strapiAdminFetch(`/reader-push-subscriptions/${documentId}`, undefined, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

export async function saveReaderPushSubscription(
  fcmToken: string,
  userAgent?: string
): Promise<void> {
  const data = {
    fcmToken,
    fcmTokenKey: fcmTokenKey(fcmToken),
    userAgent: userAgent?.slice(0, 500),
  };

  const existing = await findReaderSubscriptionByToken(fcmToken);
  if (existing) {
    await updateReaderSubscription(existing.documentId, data);
    return;
  }

  try {
    await strapiAdminFetch('/reader-push-subscriptions', undefined, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  } catch (error) {
    if (!isDuplicateFcmTokenError(error)) throw error;

    const duplicate = await findReaderSubscriptionByToken(fcmToken);
    if (!duplicate) throw error;

    await updateReaderSubscription(duplicate.documentId, data);
  }
}

export async function deleteReaderPushSubscription(documentId: string): Promise<void> {
  await strapiAdminFetch(`/reader-push-subscriptions/${documentId}`, undefined, {
    method: 'DELETE',
  });
}

export async function listReaderPushSubscriptions(): Promise<StoredReaderSubscription[]> {
  const pageSize = 100;
  let page = 1;
  const all: StoredReaderSubscription[] = [];

  for (;;) {
    const response = await strapiAdminFetch<ReaderSubscriptionListResponse>(
      '/reader-push-subscriptions',
      {
        pagination: { page, pageSize },
      }
    );

    all.push(...response.data);
    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }

  return all;
}
