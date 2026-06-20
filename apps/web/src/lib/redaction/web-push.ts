import webpush from 'web-push';
import qs from 'qs';
import { getStrapiUrl } from '@/lib/redaction/config';
import type { PushSubscriptionPayload } from '@/lib/redaction/types';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

function vapidSubject(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') ?? 'wab-infos.com';
  return process.env.VAPID_SUBJECT || `mailto:contact@${site}`;
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export function ensureWebPushConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
  return true;
}

interface StoredSubscription {
  documentId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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
  subscription: PushSubscriptionPayload
): Promise<void> {
  const existing = await strapiAdminFetch<{ data: StoredSubscription[] }>(
    '/editor-push-subscriptions',
    {
      filters: { endpoint: { $eq: subscription.endpoint } },
      pagination: { pageSize: 1 },
    }
  );

  const data = {
    userEmail: userEmail.toLowerCase(),
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };

  if (existing.data[0]) {
    await strapiAdminFetch(`/editor-push-subscriptions/${existing.data[0].documentId}`, undefined, {
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
  if (!ensureWebPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const subscriptions = await listPushSubscriptions();
  let sent = 0;
  let failed = 0;

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url.startsWith('http') ? payload.url : `${siteUrl}${payload.url}`,
  });

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
          await deletePushSubscription(sub.documentId).catch(() => undefined);
        }
      }
    })
  );

  return { sent, failed };
}
