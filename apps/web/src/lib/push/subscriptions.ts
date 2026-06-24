import { pushEndpointKey, isDuplicatePushEndpointError } from '@/lib/push/endpoint-key';
import { strapiAdminFetch } from '@/lib/push/strapi-admin';

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface StoredReaderSubscription {
  documentId: string;
  endpoint: string;
  endpointKey?: string;
  p256dh: string;
  auth: string;
}

interface ReaderSubscriptionListResponse {
  data: StoredReaderSubscription[];
  meta?: { pagination?: { pageCount?: number } };
}

async function findReaderSubscriptionByEndpoint(
  endpoint: string
): Promise<StoredReaderSubscription | null> {
  const endpointKey = pushEndpointKey(endpoint);

  const byKey = await strapiAdminFetch<ReaderSubscriptionListResponse>(
    '/reader-push-subscriptions',
    {
      filters: { endpointKey: { $eq: endpointKey } },
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

    const match = batch.data.find((row) => row.endpoint === endpoint);
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
  subscription: PushSubscriptionKeys,
  userAgent?: string
): Promise<void> {
  const data = {
    endpoint: subscription.endpoint,
    endpointKey: pushEndpointKey(subscription.endpoint),
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: userAgent?.slice(0, 500),
  };

  const existing = await findReaderSubscriptionByEndpoint(subscription.endpoint);
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
    if (!isDuplicatePushEndpointError(error)) throw error;

    const duplicate = await findReaderSubscriptionByEndpoint(subscription.endpoint);
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
