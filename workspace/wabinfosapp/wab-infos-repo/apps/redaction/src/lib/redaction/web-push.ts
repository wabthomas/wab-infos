import qs from 'qs';
import { getStrapiUrl } from '@/lib/redaction/config';
import {
  ensureFirebaseAdmin,
  isInvalidFcmTokenError,
  sendFcmToToken,
} from '@/lib/firebase/admin';
import { isFirebaseAdminConfigured } from '@/lib/firebase/config';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

interface StoredSubscription {
  documentId: string;
  fcmToken: string;
}

async function strapiAdminFetch<T>(
  path: string,
  params?: Record<string, unknown>,
  options?: RequestInit
): Promise<T> {
  if (!STRAPI_TOKEN) throw new Error('STRAPI_API_TOKEN manquant');
  const query = params ? `?${qs.stringify(params, { encodeValuesOnly: true })}` : '';
  const res = await fetch(`${getStrapiUrl()}/api${path}${query}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...options?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function savePushSubscription(
  userEmail: string,
  fcmToken: string
): Promise<void> {
  let existing: StoredSubscription | undefined;

  try {
    const response = await strapiAdminFetch<{ data: StoredSubscription[] }>(
      '/editor-push-subscriptions',
      {
        filters: { fcmToken: { $eq: fcmToken } },
        pagination: { pageSize: 1 },
      }
    );
    existing = response.data[0];
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!(message.includes('400') && message.includes('invalid key'))) throw error;
  }

  const data = {
    userEmail: userEmail.toLowerCase(),
    fcmToken,
  };

  if (existing) {
    await strapiAdminFetch(`/editor-push-subscriptions/${existing.documentId}`, undefined, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
    return;
  }

  await strapiAdminFetch('/editor-push-subscriptions', undefined, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export async function listPushSubscriptions(): Promise<StoredSubscription[]> {
  const response = await strapiAdminFetch<{ data: StoredSubscription[] }>(
    '/editor-push-subscriptions',
    { pagination: { pageSize: 100 } }
  );
  return response.data;
}

export async function deletePushSubscription(documentId: string): Promise<void> {
  await strapiAdminFetch(`/editor-push-subscriptions/${documentId}`, undefined, {
    method: 'DELETE',
  });
}

export async function notifyAllEditors(payload: {
  title: string;
  body: string;
  url: string;
}): Promise<{ sent: number; failed: number }> {
  if (!isFirebaseAdminConfigured() || !ensureFirebaseAdmin()) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await listPushSubscriptions();
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
          await deletePushSubscription(sub.documentId).catch(() => undefined);
        }
      }
    })
  );

  return { sent, failed };
}
