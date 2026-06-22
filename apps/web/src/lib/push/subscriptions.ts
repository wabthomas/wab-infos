import { strapiAdminFetch } from '@/lib/push/strapi-admin';

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface StoredReaderSubscription {
  documentId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function saveReaderPushSubscription(
  subscription: PushSubscriptionKeys,
  userAgent?: string
): Promise<void> {
  const existing = await strapiAdminFetch<{ data: StoredReaderSubscription[] }>(
    '/reader-push-subscriptions',
    {
      filters: { endpoint: { $eq: subscription.endpoint } },
      pagination: { pageSize: 1 },
    }
  );

  const data = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: userAgent?.slice(0, 500),
  };

  if (existing.data[0]) {
    await strapiAdminFetch(`/reader-push-subscriptions/${existing.data[0].documentId}`, undefined, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
    return;
  }

  await strapiAdminFetch('/reader-push-subscriptions', undefined, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
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
    const response = await strapiAdminFetch<{
      data: StoredReaderSubscription[];
      meta?: { pagination?: { pageCount?: number } };
    }>('/reader-push-subscriptions', {
      pagination: { page, pageSize },
    });

    all.push(...response.data);
    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }

  return all;
}
