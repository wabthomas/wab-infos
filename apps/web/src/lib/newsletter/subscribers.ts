import qs from 'qs';
import { randomUUID } from 'crypto';
import { newsletterConfig } from '@/lib/newsletter/config';

const STRAPI_URL =
  process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

interface StrapiSubscriber {
  id: number;
  documentId: string;
  email: string;
  status: 'active' | 'unsubscribed';
  unsubscribeToken: string;
}

function strapiHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (STRAPI_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  }
  return headers;
}

async function strapiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...options,
    headers: { ...strapiHeaders(), ...options?.headers },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Strapi ${path}: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function subscribeEmail(email: string): Promise<{ created: boolean; reactivated: boolean; blocked?: boolean }> {
  const normalized = email.trim().toLowerCase();
  const query = qs.stringify({
    filters: { email: { $eqi: normalized } },
    pagination: { pageSize: 1 },
  });

  const existing = await strapiFetch<{ data: StrapiSubscriber[] }>(`/subscribers?${query}`);
  const found = existing.data[0];

  if (found) {
    if (found.status === 'active') {
      return { created: false, reactivated: false };
    }

    // Public POST is not proof of ownership. Do not let a third party silently
    // undo an unsubscribe simply by submitting the address again.
    return { created: false, reactivated: false, blocked: true };
  }

  await strapiFetch('/subscribers', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        email: normalized,
        status: 'active',
        unsubscribeToken: randomUUID(),
        source: 'web',
        subscribedAt: new Date().toISOString(),
      },
    }),
  });

  return { created: true, reactivated: false };
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const query = qs.stringify({
    filters: { unsubscribeToken: { $eq: token } },
    pagination: { pageSize: 1 },
  });

  const result = await strapiFetch<{ data: StrapiSubscriber[] }>(`/subscribers?${query}`);
  const subscriber = result.data[0];
  if (!subscriber) return false;
  // Historical data may contain case variants of the same mailbox. Suppress all
  // active records for the address, not just the token's row.
  const matches = await strapiFetch<{ data: StrapiSubscriber[] }>(`/subscribers?${qs.stringify({
    filters: { email: { $eqi: subscriber.email.trim() } }, pagination: { pageSize: 100 },
  })}`);
  for (const row of matches.data) {
    if (row.status !== 'active') continue;
    await strapiFetch(`/subscribers/${row.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() } }),
    });
  }
  return true;
}

export async function isSubscriberActive(token: string, email: string): Promise<boolean> {
  const query = qs.stringify({ filters: { email: { $eqi: email.trim() } },
    fields: ['email', 'status', 'unsubscribeToken'], pagination: { pageSize: 100 } });
  const result = await strapiFetch<{ data: StrapiSubscriber[] }>(`/subscribers?${query}`);
  // A historical duplicate marked unsubscribed takes precedence over an active
  // variant; fail closed rather than mailing an address that opted out.
  return result.data.some((row) => row.unsubscribeToken === token && row.status === 'active') &&
    !result.data.some((row) => row.status === 'unsubscribed');
}

export async function getActiveSubscribers(): Promise<
  { email: string; unsubscribeToken: string }[]
> {
  const seen = new Set<string>();
  const subscribers: { email: string; unsubscribeToken: string }[] = [];
  // Strapi can cap pageSize server-side; use its actual pagination metadata.
  for (let page = 1; ; page++) {
    const query = qs.stringify({ filters: { status: { $eq: 'active' } },
      fields: ['email', 'unsubscribeToken'], sort: ['id:asc'], pagination: { page, pageSize: 100 } });
    const result = await strapiFetch<{ data: StrapiSubscriber[]; meta: { pagination: { pageCount: number } } }>(`/subscribers?${query}`);
    for (const row of result.data) {
      const email = row.email.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      subscribers.push({ email, unsubscribeToken: row.unsubscribeToken });
    }
    if (page >= result.meta.pagination.pageCount) break;
  }
  return subscribers;
}

export async function markArticleNewsletterSent(documentId: string): Promise<void> {
  await strapiFetch(`/articles/${documentId}?status=published`, {
    method: 'PUT',
    body: JSON.stringify({
      data: { newsletterSentAt: new Date().toISOString() },
    }),
  });
}

export async function getArticleForNewsletter(slug: string) {
  const query = qs.stringify({
    filters: { slug: { $eq: slug } },
    populate: {
      featuredImage: true,
      author: true,
      category: true,
    },
    status: 'published',
  });

  const result = await strapiFetch<{
    data: {
      documentId: string;
      title: string;
      slug: string;
      excerpt: string;
      status: string;
      publishedAt: string;
      newsletterSentAt?: string | null;
      isBreaking?: boolean;
      seoTitle?: string;
      featuredImage?: { url?: string };
      author?: { name?: string };
      category?: { name?: string; slug?: string; color?: string };
    }[];
  }>(`/articles?${query}`);

  return result.data[0] ?? null;
}

export function buildUnsubscribeUrl(token: string): string {
  return `${newsletterConfig.siteUrl}/newsletter/desinscription?token=${encodeURIComponent(token)}`;
}
