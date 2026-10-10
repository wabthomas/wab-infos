import qs from 'qs';
import { getStrapiUrl } from '@/lib/redaction/config';
import type { ArticleSeoMeta } from '@wab-infos/shared';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export interface AiArticleRow {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  seoMeta?: ArticleSeoMeta | null;
  status?: string;
  isImported?: boolean;
  aiAssisted?: boolean;
  aiProcessedAt?: string | null;
  sourceName?: string;
  sourceUrl?: string;
  publishedAt?: string | null;
  category?: { documentId: string; name: string; slug: string } | null;
  author?: { documentId: string; name: string; slug: string } | null;
  featuredImage?: {
    id: number;
    url: string;
    alternativeText?: string;
  } | null;
}

function requireToken(): string {
  if (!STRAPI_TOKEN?.trim()) {
    throw new Error('STRAPI_API_TOKEN manquant');
  }
  return STRAPI_TOKEN.trim();
}

export async function aiStrapiFetch<T>(
  path: string,
  query?: Record<string, unknown>,
  init?: RequestInit
): Promise<T> {
  const queryString = query
    ? `?${qs.stringify(query, { encodeValuesOnly: true })}`
    : '';
  const response = await fetch(`${getStrapiUrl()}/api${path}${queryString}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requireToken()}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Strapi ${path}: ${response.status} ${text.slice(0, 240)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function mapRow(entity: Record<string, unknown>): AiArticleRow {
  const category = entity.category as Record<string, unknown> | null | undefined;
  const author = entity.author as Record<string, unknown> | null | undefined;
  const featuredImage = entity.featuredImage as Record<string, unknown> | null | undefined;
  return {
    documentId: entity.documentId as string,
    title: (entity.title as string) || '',
    slug: (entity.slug as string) || '',
    excerpt: (entity.excerpt as string) || '',
    content: (entity.content as string) || '',
    seoTitle: entity.seoTitle as string | undefined,
    seoDescription: entity.seoDescription as string | undefined,
    seoMeta: (entity.seoMeta as ArticleSeoMeta | null | undefined) ?? null,
    status: entity.status as string | undefined,
    isImported: Boolean(entity.isImported),
    aiAssisted: Boolean(entity.aiAssisted),
    aiProcessedAt: (entity.aiProcessedAt as string | null | undefined) ?? null,
    sourceName: entity.sourceName as string | undefined,
    sourceUrl: entity.sourceUrl as string | undefined,
    publishedAt: (entity.publishedAt as string | null | undefined) ?? null,
    category: category?.documentId
      ? {
          documentId: category.documentId as string,
          name: (category.name as string) || '',
          slug: (category.slug as string) || '',
        }
      : null,
    author: author?.documentId
      ? {
          documentId: author.documentId as string,
          name: (author.name as string) || '',
          slug: (author.slug as string) || '',
        }
      : null,
    featuredImage: featuredImage?.id
      ? {
          id: featuredImage.id as number,
          url: (featuredImage.url as string) || '',
          alternativeText: featuredImage.alternativeText as string | undefined,
        }
      : null,
  };
}

export async function resolveRedactionHouseAuthor(): Promise<{ documentId: string; name: string }> {
  const existing = await aiStrapiFetch<{ data: Array<Record<string, unknown>> }>('/authors', {
    filters: { slug: { $eq: 'redaction-wab-infos' } },
    fields: ['name', 'slug'],
    pagination: { pageSize: 1 },
  });
  if (existing.data[0]?.documentId) {
    return {
      documentId: existing.data[0].documentId as string,
      name: (existing.data[0].name as string) || 'Rédaction Wab-infos',
    };
  }

  const created = await aiStrapiFetch<{ data: Record<string, unknown> }>('/authors', undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        name: 'Rédaction Wab-infos',
        slug: 'redaction-wab-infos',
        role: 'Rédaction',
        bio: 'Équipe éditoriale de Wab-infos.',
      },
    }),
  });
  return {
    documentId: created.data.documentId as string,
    name: 'Rédaction Wab-infos',
  };
}

export async function listImportedDraftsForAi(limit: number): Promise<AiArticleRow[]> {
  const response = await aiStrapiFetch<{ data: Array<Record<string, unknown>> }>('/articles', {
    filters: {
      isImported: { $eq: true },
      status: { $eq: 'draft' },
      aiProcessedAt: { $null: true },
    },
    populate: {
      category: { fields: ['name', 'slug'] },
      author: { fields: ['name', 'slug'] },
      featuredImage: { fields: ['url', 'alternativeText'] },
    },
    fields: [
      'title',
      'slug',
      'excerpt',
      'content',
      'seoTitle',
      'seoDescription',
      'seoMeta',
      'status',
      'isImported',
      'aiAssisted',
      'aiProcessedAt',
      'sourceName',
      'sourceUrl',
      'publishedAt',
      'updatedAt',
    ],
    sort: ['updatedAt:desc'],
    pagination: { pageSize: Math.min(Math.max(limit, 1), 20) },
    status: 'draft',
  });
  return (response.data ?? [])
    .map(mapRow)
    .filter((row) => !row.aiProcessedAt && row.status !== 'published');
}

export async function getAiArticle(documentId: string): Promise<AiArticleRow | null> {
  try {
    const draft = await aiStrapiFetch<{ data: Record<string, unknown> | null }>(
      `/articles/${documentId}`,
      {
        populate: {
          category: { fields: ['name', 'slug'] },
          author: { fields: ['name', 'slug'] },
          featuredImage: { fields: ['url', 'alternativeText'] },
        },
        status: 'draft',
      }
    );
    if (draft.data?.documentId) return mapRow(draft.data);
  } catch {
    // try published
  }
  try {
    const published = await aiStrapiFetch<{ data: Record<string, unknown> | null }>(
      `/articles/${documentId}`,
      {
        populate: {
          category: { fields: ['name', 'slug'] },
          author: { fields: ['name', 'slug'] },
          featuredImage: { fields: ['url', 'alternativeText'] },
        },
        status: 'published',
      }
    );
    if (published.data?.documentId) return mapRow(published.data);
  } catch {
    return null;
  }
  return null;
}

export async function listCategoriesForAi(): Promise<Array<{ documentId: string; name: string; slug: string }>> {
  const response = await aiStrapiFetch<{ data: Array<Record<string, unknown>> }>('/categories', {
    fields: ['name', 'slug'],
    pagination: { pageSize: 100 },
    sort: ['name:asc'],
  });
  return (response.data ?? [])
    .filter((row) => row.documentId)
    .map((row) => ({
      documentId: row.documentId as string,
      name: (row.name as string) || '',
      slug: (row.slug as string) || '',
    }));
}

export async function saveAiArticleDraft(
  documentId: string,
  data: Record<string, unknown>
): Promise<void> {
  await aiStrapiFetch(`/articles/${documentId}?status=draft`, undefined, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

export async function publishAiArticle(
  documentId: string,
  data: Record<string, unknown>
): Promise<void> {
  const now = new Date().toISOString();
  await aiStrapiFetch(`/articles/${documentId}?status=published`, undefined, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        ...data,
        status: 'published',
        scheduledAt: null,
        publishedAt: now,
        wpPublishedAt: now,
      },
    }),
  });
}

export async function createAiDraftArticle(data: Record<string, unknown>): Promise<string> {
  const response = await aiStrapiFetch<{ data: Record<string, unknown> }>(
    '/articles?status=draft',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ data: { ...data, status: 'draft', publishedAt: null, scheduledAt: null } }),
    }
  );
  return response.data.documentId as string;
}
