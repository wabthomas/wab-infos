import qs from 'qs';
import {
  appendSourceSignature,
  readingTimeFromHtml,
  slugifyTitle,
} from './html';
import type { ParsedArticle } from './types';

function getStrapiUrl(): string {
  return process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
}

function apiHeaders(): HeadersInit {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) throw new Error('STRAPI_API_TOKEN manquant');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function strapiFetch<T>(
  path: string,
  params?: Record<string, unknown>,
  options?: RequestInit
): Promise<T> {
  const query = params ? `?${qs.stringify(params, { encodeValuesOnly: true })}` : '';
  const res = await fetch(`${getStrapiUrl()}/api${path}${query}`, {
    ...options,
    headers: { ...apiHeaders(), ...options?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

interface StrapiEntity {
  id?: number;
  documentId: string;
  [key: string]: unknown;
}

const categoryCache = new Map<string, string>();
let syndicationAuthorId: string | null = null;

export async function findArticleBySourceUrl(sourceUrl: string): Promise<boolean> {
  const response = await strapiFetch<{ data: StrapiEntity[] }>('/articles', {
    filters: { sourceUrl: { $eq: sourceUrl } },
    pagination: { pageSize: 1 },
    status: 'draft',
    fields: ['documentId'],
  });
  if (response.data?.length) return true;

  const published = await strapiFetch<{ data: StrapiEntity[] }>('/articles', {
    filters: { sourceUrl: { $eq: sourceUrl } },
    pagination: { pageSize: 1 },
    status: 'published',
    fields: ['documentId'],
  });
  return Boolean(published.data?.length);
}

export async function countImportedToday(sourceName: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const response = await strapiFetch<{ data: StrapiEntity[]; meta?: { pagination?: { total?: number } } }>(
    '/articles',
    {
      filters: {
        isImported: { $eq: true },
        sourceName: { $eq: sourceName },
        createdAt: { $gte: start.toISOString() },
      },
      pagination: { pageSize: 1 },
      status: 'draft',
      fields: ['documentId'],
    }
  );
  const draftTotal = response.meta?.pagination?.total ?? response.data?.length ?? 0;

  const published = await strapiFetch<{
    data: StrapiEntity[];
    meta?: { pagination?: { total?: number } };
  }>('/articles', {
    filters: {
      isImported: { $eq: true },
      sourceName: { $eq: sourceName },
      createdAt: { $gte: start.toISOString() },
    },
    pagination: { pageSize: 1 },
    status: 'published',
    fields: ['documentId'],
  });
  const pubTotal = published.meta?.pagination?.total ?? published.data?.length ?? 0;
  return draftTotal + pubTotal;
}

async function resolveCategoryDocumentId(slug: string): Promise<string | null> {
  if (categoryCache.has(slug)) return categoryCache.get(slug)!;
  const response = await strapiFetch<{ data: StrapiEntity[] }>('/categories', {
    filters: { slug: { $eq: slug } },
    pagination: { pageSize: 1 },
    fields: ['documentId', 'slug'],
  });
  const id = response.data?.[0]?.documentId;
  if (id) {
    categoryCache.set(slug, id);
    return id;
  }
  if (slug !== 'actualite') {
    return resolveCategoryDocumentId('actualite');
  }
  return null;
}

async function resolveSyndicationAuthor(): Promise<string | null> {
  if (syndicationAuthorId) return syndicationAuthorId;
  const existing = await strapiFetch<{ data: StrapiEntity[] }>('/authors', {
    filters: { slug: { $eq: 'syndication' } },
    pagination: { pageSize: 1 },
    fields: ['documentId', 'slug'],
  });
  if (existing.data?.[0]?.documentId) {
    syndicationAuthorId = existing.data[0].documentId;
    return syndicationAuthorId;
  }

  try {
    const created = await strapiFetch<{ data: StrapiEntity }>('/authors', undefined, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          name: 'Syndication',
          slug: 'syndication',
          bio: 'Articles repris automatiquement depuis des sources partenaires / revue de presse.',
          role: 'Agence',
        },
      }),
    });
    syndicationAuthorId = created.data.documentId;
    return syndicationAuthorId;
  } catch {
    return null;
  }
}

export async function uploadImageFromUrl(
  imageUrl: string,
  alternativeText?: string
): Promise<number | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'WabInfosNewsIngest/1.0 (+https://wab-infos.com)' },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    let filename = 'featured.jpg';
    try {
      filename = decodeURIComponent(new URL(imageUrl).pathname.split('/').pop() || filename);
      if (!/\.(jpe?g|png|webp|gif)$/i.test(filename)) {
        filename = `${filename.replace(/\.[^.]+$/, '') || 'featured'}.jpg`;
      }
    } catch {
      // keep default
    }

    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
    if (alternativeText?.trim()) {
      form.append('fileInfo', JSON.stringify({ alternativeText: alternativeText.trim().slice(0, 200) }));
    }

    const uploadRes = await fetch(`${getStrapiUrl()}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
      body: form,
    });
    if (!uploadRes.ok) return null;
    const uploaded = (await uploadRes.json()) as Array<{ id: number }>;
    return uploaded?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function createImportedDraft(article: ParsedArticle): Promise<string> {
  const content = appendSourceSignature(article.html, article.sourceName, article.sourceUrl);
  const categoryId = await resolveCategoryDocumentId(article.categoryGuess);
  const authorId = await resolveSyndicationAuthor();
  let featuredImageId: number | null = null;
  if (article.imageUrl) {
    featuredImageId = await uploadImageFromUrl(article.imageUrl, article.imageAlt);
  }

  const baseSlug = slugifyTitle(article.title) || `import-${Date.now().toString(36)}`;
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

  const data: Record<string, unknown> = {
    title: article.title.slice(0, 300),
    slug,
    excerpt: (article.excerpt || article.title).slice(0, 500),
    content,
    // Statut éditorial custom — jamais « published » à l’import.
    status: 'draft',
    isImported: true,
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    canonicalUrl: article.sourceUrl,
    readingTime: readingTimeFromHtml(content),
    seoTitle: article.title.slice(0, 70),
    seoDescription: (article.excerpt || article.title).slice(0, 160),
    publishedAt: null,
    scheduledAt: null,
  };

  if (categoryId) data.category = categoryId;
  if (authorId) data.author = authorId;
  if (featuredImageId) data.featuredImage = featuredImageId;

  // Forcer la version Document Service en brouillon (Strapi D&P).
  const response = await strapiFetch<{ data: StrapiEntity }>('/articles?status=draft', undefined, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });

  const documentId = response.data.documentId;
  // Filet de sécurité : certains tokens / chemins Strapi publient malgré status=draft.
  if (response.data.publishedAt || (await findPublishedByDocumentId(documentId))) {
    await forceUnpublishImported(documentId);
  }
  return documentId;
}

async function findPublishedByDocumentId(documentId: string): Promise<boolean> {
  try {
    const published = await strapiFetch<{ data: StrapiEntity | null }>(
      `/articles/${documentId}`,
      { status: 'published', fields: ['documentId', 'publishedAt'] }
    );
    return Boolean(published.data?.documentId);
  } catch {
    return false;
  }
}

async function forceUnpublishImported(documentId: string): Promise<void> {
  try {
    await strapiFetch(`/articles/${documentId}/retire-public`, undefined, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  } catch (err) {
    console.error('[news-ingest] forceUnpublish failed', documentId, err);
  }
}

/** Dépublication de tous les imports encore en ligne (correctif ponctuel). */
export async function unpublishAllLiveImports(): Promise<{ unpublished: string[]; errors: string[] }> {
  const unpublished: string[] = [];
  const errors: string[] = [];
  const response = await strapiFetch<{ data: StrapiEntity[] }>('/articles', {
    filters: { isImported: { $eq: true } },
    pagination: { pageSize: 100 },
    status: 'published',
    fields: ['documentId', 'title', 'status'],
  });

  for (const entity of response.data || []) {
    try {
      await forceUnpublishImported(entity.documentId);
      unpublished.push(entity.documentId);
    } catch (err) {
      errors.push(
        `${entity.documentId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return { unpublished, errors };
}
