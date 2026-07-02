import type { StrapiMedia } from '@wab-infos/shared';
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
  featuredImage?: StrapiMedia;
  content?: string;
  articleUrl: string;
}

function mapFeaturedImage(media: unknown): StrapiMedia | undefined {
  if (!media || typeof media !== 'object') return undefined;

  const record = media as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    return mapFeaturedImage(record.data);
  }

  const url = record.url;
  if (typeof url !== 'string' || !url) return undefined;

  return {
    id: typeof record.id === 'number' ? record.id : 0,
    url,
    alternativeText: typeof record.alternativeText === 'string' ? record.alternativeText : undefined,
    caption: typeof record.caption === 'string' ? record.caption : undefined,
    width: typeof record.width === 'number' ? record.width : undefined,
    height: typeof record.height === 'number' ? record.height : undefined,
    formats: record.formats as StrapiMedia['formats'],
  };
}

export async function getArticleForSocial(slug: string): Promise<SocialArticle | null> {
  const query = qs.stringify({
    filters: { slug: { $eq: slug } },
    populate: { category: true, featuredImage: true },
    fields: [
      'documentId',
      'title',
      'slug',
      'excerpt',
      'content',
      'status',
      'publishedAt',
      'wpPublishedAt',
      'facebookPostedAt',
      'xPostedAt',
    ],
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
      featuredImage?: StrapiMedia | { data?: StrapiMedia | null };
      content?: string;
    }[];
  }>(`/articles?${query}`);

  const raw = result.data[0];
  if (!raw) return null;

  const categorySlug = raw.category?.slug ?? 'actualite';
  const articleUrl = `${socialConfig.siteUrl}${getArticlePath(
    { slug: raw.slug, category: raw.category },
    categorySlug
  )}`;

  return {
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    status: raw.status,
    publishedAt: raw.publishedAt,
    wpPublishedAt: raw.wpPublishedAt,
    facebookPostedAt: raw.facebookPostedAt,
    xPostedAt: raw.xPostedAt,
    category: raw.category,
    featuredImage: mapFeaturedImage(raw.featuredImage),
    content: raw.content,
    articleUrl,
  };
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
