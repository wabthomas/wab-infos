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

export async function subscribeEmail(email: string): Promise<{ created: boolean; reactivated: boolean }> {
  const normalized = email.trim().toLowerCase();
  const query = qs.stringify({
    filters: { email: { $eq: normalized } },
    pagination: { pageSize: 1 },
  });

  const existing = await strapiFetch<{ data: StrapiSubscriber[] }>(`/subscribers?${query}`);
  const found = existing.data[0];

  if (found) {
    if (found.status === 'active') {
      return { created: false, reactivated: false };
    }

    await strapiFetch(`/subscribers/${found.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          status: 'active',
          subscribedAt: new Date().toISOString(),
          unsubscribedAt: null,
        },
      }),
    });

    return { created: false, reactivated: true };
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
  if (!subscriber || subscriber.status === 'unsubscribed') return false;

  await strapiFetch(`/subscribers/${subscriber.documentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        status: 'unsubscribed',
        unsubscribedAt: new Date().toISOString(),
      },
    }),
  });

  return true;
}

export async function getActiveSubscribers(): Promise<
  { email: string; unsubscribeToken: string }[]
> {
  const query = qs.stringify({
    filters: { status: { $eq: 'active' } },
    fields: ['email', 'unsubscribeToken'],
    pagination: { pageSize: 5000 },
  });

  const result = await strapiFetch<{ data: StrapiSubscriber[] }>(`/subscribers?${query}`);
  return result.data.map((s) => ({
    email: s.email,
    unsubscribeToken: s.unsubscribeToken,
  }));
}

export async function markArticleNewsletterSent(documentId: string): Promise<void> {
  await strapiFetch(`/articles/${documentId}`, {
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
