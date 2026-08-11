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
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Strapi ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!text.trim()) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Strapi réponse JSON invalide: ${text.slice(0, 120)}`);
  }
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

export async function listPushSubscriptionsDetailed(): Promise<
  Array<StoredSubscription & { userEmail: string }>
> {
  const response = await strapiAdminFetch<{
    data: Array<StoredSubscription & { userEmail?: string }>;
  }>('/editor-push-subscriptions', {
    pagination: { pageSize: 200 },
    fields: ['documentId', 'fcmToken', 'userEmail'],
  });
  return (response.data || [])
    .filter((row) => row.fcmToken && row.userEmail)
    .map((row) => ({
      documentId: row.documentId,
      fcmToken: row.fcmToken,
      userEmail: String(row.userEmail).toLowerCase(),
    }));
}

export async function deletePushSubscription(documentId: string): Promise<void> {
  await strapiAdminFetch(`/editor-push-subscriptions/${documentId}`, undefined, {
    method: 'DELETE',
  });
}

export async function listPushSubscriptionsForUser(
  userEmail: string
): Promise<Array<StoredSubscription & { userEmail: string }>> {
  const email = userEmail.toLowerCase();
  const response = await strapiAdminFetch<{
    data: Array<StoredSubscription & { userEmail?: string }>;
  }>('/editor-push-subscriptions', {
    filters: { userEmail: { $eq: email } },
    pagination: { pageSize: 50 },
    fields: ['documentId', 'fcmToken', 'userEmail'],
  });
  return (response.data || [])
    .filter((row) => row.fcmToken && row.documentId)
    .map((row) => ({
      documentId: row.documentId,
      fcmToken: row.fcmToken,
      userEmail: String(row.userEmail ?? email).toLowerCase(),
    }));
}

export async function deletePushSubscriptionsForUser(userEmail: string): Promise<number> {
  const subs = await listPushSubscriptionsForUser(userEmail);
  await Promise.all(subs.map((sub) => deletePushSubscription(sub.documentId)));
  return subs.length;
}

export async function notifyEditorsByEmail(
  emails: string[],
  payload: { title: string; body: string; url: string }
): Promise<{ sent: number; failed: number }> {
  if (!isFirebaseAdminConfigured() || !ensureFirebaseAdmin()) {
    return { sent: 0, failed: 0 };
  }

  const wanted = new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  if (wanted.size === 0) return { sent: 0, failed: 0 };

  const subscriptions = await listPushSubscriptionsDetailed();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      if (!wanted.has(sub.userEmail) || !sub.fcmToken) {
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

function startOfDayInKinshasaIso(now = new Date()): string {
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kinshasa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${datePart}T00:00:00+01:00`).toISOString();
}

async function authorWroteToday(email: string, sinceIso: string): Promise<boolean> {
  try {
    const authors = await strapiAdminFetch<{ data: Array<{ documentId: string }> }>('/authors', {
      filters: { email: { $eqi: email } },
      pagination: { pageSize: 1 },
      fields: ['documentId'],
    });
    const authorId = authors.data?.[0]?.documentId;
    if (!authorId) return false;

    const drafts = await strapiAdminFetch<{
      meta?: { pagination?: { total?: number } };
    }>('/articles', {
      filters: {
        author: { documentId: { $eq: authorId } },
        createdAt: { $gte: sinceIso },
      },
      pagination: { pageSize: 1 },
      status: 'draft',
      fields: ['documentId'],
    });
    if ((drafts.meta?.pagination?.total ?? 0) > 0) return true;

    const published = await strapiAdminFetch<{
      meta?: { pagination?: { total?: number } };
    }>('/articles', {
      filters: {
        author: { documentId: { $eq: authorId } },
        createdAt: { $gte: sinceIso },
      },
      pagination: { pageSize: 1 },
      status: 'published',
      fields: ['documentId'],
    });
    return (published.meta?.pagination?.total ?? 0) > 0;
  } catch {
    return false;
  }
}

export type WritingReminderSlot = 'morning' | 'noon' | 'evening';

const REMINDER_COPY: Record<
  WritingReminderSlot,
  { title: string; body: string }
> = {
  morning: {
    title: 'Bonjour — à vos claviers',
    body: 'C’est le moment de rédiger un article pour Wab-infos.',
  },
  noon: {
    title: 'Rappel midi',
    body: 'Avez-vous déjà publié ou commencé un article aujourd’hui ?',
  },
  evening: {
    title: 'Rappel du soir',
    body: 'Dernière fenêtre de la journée pour écrire un article.',
  },
};

/** Push matin / midi / soir aux rédacteurs sans article écrit aujourd’hui (Kinshasa). */
export async function sendWritingReminders(
  slot: WritingReminderSlot = 'morning'
): Promise<{ sent: number; failed: number; skipped: number; slot: WritingReminderSlot }> {
  if (!isFirebaseAdminConfigured() || !ensureFirebaseAdmin()) {
    return { sent: 0, failed: 0, skipped: 0, slot };
  }

  const copy = REMINDER_COPY[slot];
  const sinceIso = startOfDayInKinshasaIso();
  const subscriptions = await listPushSubscriptionsDetailed();
  const byEmail = new Map<string, Array<StoredSubscription & { userEmail: string }>>();
  for (const sub of subscriptions) {
    const list = byEmail.get(sub.userEmail) ?? [];
    list.push(sub);
    byEmail.set(sub.userEmail, list);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const [email, subs] of byEmail) {
    const wrote = await authorWroteToday(email, sinceIso);
    if (wrote) {
      skipped += subs.length;
      continue;
    }

    const body =
      slot === 'morning'
        ? copy.body
        : `${copy.body} Vous n’avez encore rien écrit aujourd’hui.`;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await sendFcmToToken(sub.fcmToken, {
            title: copy.title,
            body,
            url: '/nouveau',
          });
          sent++;
        } catch (err: unknown) {
          failed++;
          if (isInvalidFcmTokenError(err)) {
            await deletePushSubscription(sub.documentId).catch(() => undefined);
          }
        }
      })
    );
  }

  return { sent, failed, skipped, slot };
}
