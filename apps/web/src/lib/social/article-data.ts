import qs from 'qs';
import { getArticlePath } from '@/config/site';
import { socialConfig } from '@/lib/social/config';

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

async function strapiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!STRAPI_TOKEN) throw new Error('STRAPI_API_TOKEN manquant');

  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Strapi ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export interface SocialArticle {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  publishedAt?: string;
  wpPublishedAt?: string | null;
  facebookPostedAt?: string | null;
  xPostedAt?: string | null;
  category?: { slug?: string };
  articleUrl: string;
}

export async function getArticleForSocial(slug: string): Promise<SocialArticle | null> {
  const query = qs.stringify({
    filters: { slug: { $eq: slug } },
    populate: { category: true },
    status: 'published',
  });

  const result = await strapiFetch<{
    data: {
      documentId: string;
      title: string;
      slug: string;
      excerpt: string;
      status: string;
      publishedAt?: string;
      wpPublishedAt?: string | null;
      facebookPostedAt?: string | null;
      xPostedAt?: string | null;
      category?: { slug?: string };
    }[];
  }>(`/articles?${query}`);

  const article = result.data[0];
  if (!article) return null;

  const categorySlug = article.category?.slug ?? 'actualite';
  const articleUrl = `${socialConfig.siteUrl}${getArticlePath(
    { slug: article.slug, category: article.category },
    categorySlug
  )}`;

  return { ...article, articleUrl };
}

export async function markFacebookPosted(documentId: string): Promise<void> {
  await strapiFetch(`/articles/${documentId}?status=published`, {
    method: 'PUT',
    body: JSON.stringify({
      data: { facebookPostedAt: new Date().toISOString() },
    }),
  });
}

export async function markXPosted(documentId: string): Promise<void> {
  await strapiFetch(`/articles/${documentId}?status=published`, {
    method: 'PUT',
    body: JSON.stringify({
      data: { xPostedAt: new Date().toISOString() },
    }),
  });
}
