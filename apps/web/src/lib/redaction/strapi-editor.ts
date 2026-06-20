import { cookies } from 'next/headers';
import qs from 'qs';
import { getStrapiUrl, REDACTION_COOKIE } from '@/lib/redaction/config';
import type {
  ArticleEditorPayload,
  RedactionArticle,
  RedactionAuthor,
  RedactionCategory,
  RedactionStats,
  RedactionUser,
} from '@/lib/redaction/types';
import { calculateReadingTime } from '@/lib/utils';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

interface StrapiEntity {
  id: number;
  documentId: string;
  [key: string]: unknown;
}

function apiTokenHeaders(): HeadersInit {
  if (!STRAPI_TOKEN) {
    throw new Error('STRAPI_API_TOKEN manquant pour l’espace rédaction');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_TOKEN}`,
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
    headers: { ...apiTokenHeaders(), ...options?.headers },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function getRedactionJwt(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REDACTION_COOKIE)?.value ?? null;
}

export async function verifyRedactionUser(jwt: string): Promise<RedactionUser | null> {
  try {
    const res = await fetch(`${getStrapiUrl()}/api/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id: number; email: string; username: string };
    if (!user.email) return null;
    return { id: user.id, email: user.email.toLowerCase(), username: user.username };
  } catch {
    return null;
  }
}

export async function requireRedactionUser(): Promise<RedactionUser> {
  const jwt = await getRedactionJwt();
  if (!jwt) throw new RedactionAuthError('Non connecté');
  const user = await verifyRedactionUser(jwt);
  if (!user) throw new RedactionAuthError('Session expirée');
  return user;
}

export class RedactionAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedactionAuthError';
  }
}

function mapArticle(entity: StrapiEntity): RedactionArticle {
  const category = entity.category as StrapiEntity | null | undefined;
  const featuredImage = entity.featuredImage as StrapiEntity | null | undefined;

  return {
    documentId: entity.documentId,
    title: entity.title as string,
    slug: entity.slug as string,
    excerpt: entity.excerpt as string,
    content: entity.content as string,
    status: entity.status as RedactionArticle['status'],
    isBreaking: (entity.isBreaking as boolean) ?? false,
    isFeatured: (entity.isFeatured as boolean) ?? false,
    viewCount: (entity.viewCount as number) ?? 0,
    readingTime: (entity.readingTime as number) ?? 3,
    publishedAt: entity.publishedAt as string | undefined,
    wpPublishedAt: entity.wpPublishedAt as string | undefined,
    updatedAt: entity.updatedAt as string,
    category: category
      ? {
          documentId: category.documentId,
          name: category.name as string,
          slug: category.slug as string,
          color: category.color as string | undefined,
        }
      : undefined,
    featuredImage: featuredImage?.url
      ? { id: featuredImage.id, url: featuredImage.url as string }
      : undefined,
  };
}

async function resolveAuthorForUser(user: RedactionUser): Promise<RedactionAuthor> {
  const response = await strapiFetch<{ data: StrapiEntity[] }>('/authors', {
    filters: { email: { $eqi: user.email } },
    pagination: { pageSize: 1 },
  });

  if (response.data[0]) {
    const a = response.data[0];
    return {
      documentId: a.documentId,
      name: a.name as string,
      slug: a.slug as string,
    };
  }

  const slug = user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const created = await strapiFetch<{ data: StrapiEntity }>('/authors', undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        name: user.username || user.email.split('@')[0],
        slug: slug || `auteur-${user.id}`,
        email: user.email,
        role: 'Journaliste',
      },
    }),
  });

  return {
    documentId: created.data.documentId,
    name: created.data.name as string,
    slug: created.data.slug as string,
  };
}

export async function getEditorProfile(user: RedactionUser): Promise<{
  user: RedactionUser;
  author: RedactionAuthor;
}> {
  const author = await resolveAuthorForUser(user);
  return { user, author };
}

export async function listEditorArticles(
  user: RedactionUser,
  status?: 'draft' | 'published' | 'all'
): Promise<RedactionArticle[]> {
  const author = await resolveAuthorForUser(user);

  const filters: Record<string, unknown> = {
    author: { documentId: { $eq: author.documentId } },
  };

  if (status === 'draft') {
    filters.status = { $eq: 'draft' };
  } else if (status === 'published') {
    filters.status = { $eq: 'published' };
  }

  const response = await strapiFetch<{ data: StrapiEntity[] }>('/articles', {
    filters,
    populate: { category: true, featuredImage: true, author: true },
    sort: ['updatedAt:desc'],
    pagination: { pageSize: 100 },
    status: 'published',
  });

  // Inclure aussi les brouillons (status=draft côté Strapi D&P)
  const drafts = await strapiFetch<{ data: StrapiEntity[] }>('/articles', {
    filters: { author: { documentId: { $eq: author.documentId } } },
    populate: { category: true, featuredImage: true },
    sort: ['updatedAt:desc'],
    pagination: { pageSize: 100 },
    status: 'draft',
  });

  const merged = new Map<string, RedactionArticle>();
  for (const item of [...response.data, ...drafts.data]) {
    merged.set(item.documentId, mapArticle(item));
  }

  let articles = [...merged.values()];

  if (status === 'draft') {
    articles = articles.filter((a) => a.status === 'draft');
  } else if (status === 'published') {
    articles = articles.filter((a) => a.status === 'published');
  }

  return articles.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getEditorArticle(
  user: RedactionUser,
  documentId: string
): Promise<RedactionArticle | null> {
  const author = await resolveAuthorForUser(user);

  for (const publicationStatus of ['published', 'draft'] as const) {
    try {
      const response = await strapiFetch<{ data: StrapiEntity }>(`/articles/${documentId}`, {
        populate: { category: true, featuredImage: true, author: true },
        status: publicationStatus,
      });

      const articleAuthor = response.data.author as StrapiEntity | undefined;
      if (articleAuthor?.documentId !== author.documentId) {
        throw new RedactionAuthError('Accès refusé à cet article');
      }

      return mapArticle(response.data);
    } catch (err) {
      if (err instanceof RedactionAuthError) throw err;
      // essayer l'autre version (draft / published)
    }
  }

  return null;
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function contentToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '<p></p>';
  if (trimmed.includes('<p>') || trimmed.includes('<br')) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export async function createEditorArticle(
  user: RedactionUser,
  payload: ArticleEditorPayload
): Promise<RedactionArticle> {
  const author = await resolveAuthorForUser(user);
  const slug = `${slugifyTitle(payload.title)}-${Date.now().toString(36)}`;
  const content = contentToHtml(payload.content);
  const status = payload.publish ? 'published' : 'draft';

  const endpoint = payload.publish ? '/articles?status=published' : '/articles';

  const response = await strapiFetch<{ data: StrapiEntity }>(endpoint, undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        title: payload.title.trim(),
        slug,
        excerpt: payload.excerpt.trim().slice(0, 500),
        content,
        status,
        author: author.documentId,
        category: payload.categoryDocumentId,
        featuredImage: payload.featuredImageId ?? undefined,
        isBreaking: payload.isBreaking ?? false,
        readingTime: calculateReadingTime(content),
        seoTitle: payload.title.trim().slice(0, 70),
        seoDescription: payload.excerpt.trim().slice(0, 160),
      },
    }),
  });

  return mapArticle(response.data);
}

export async function updateEditorArticle(
  user: RedactionUser,
  documentId: string,
  payload: Partial<ArticleEditorPayload>
): Promise<RedactionArticle> {
  await getEditorArticle(user, documentId);

  const data: Record<string, unknown> = {};

  if (payload.title !== undefined) data.title = payload.title.trim();
  if (payload.excerpt !== undefined) data.excerpt = payload.excerpt.trim().slice(0, 500);
  if (payload.content !== undefined) {
    const content = contentToHtml(payload.content);
    data.content = content;
    data.readingTime = calculateReadingTime(content);
  }
  if (payload.categoryDocumentId) data.category = payload.categoryDocumentId;
  if (payload.featuredImageId !== undefined) {
    data.featuredImage = payload.featuredImageId;
  }
  if (payload.isBreaking !== undefined) data.isBreaking = payload.isBreaking;
  if (payload.publish !== undefined) {
    data.status = payload.publish ? 'published' : 'draft';
  }

  const statusParam = payload.publish ? 'published' : 'draft';

  const response = await strapiFetch<{ data: StrapiEntity }>(
    `/articles/${documentId}?status=${statusParam}`,
    undefined,
    {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }
  );

  return mapArticle(response.data);
}

export async function getEditorStats(user: RedactionUser): Promise<RedactionStats> {
  const articles = await listEditorArticles(user, 'all');

  return {
    totalArticles: articles.length,
    publishedCount: articles.filter((a) => a.status === 'published').length,
    draftCount: articles.filter((a) => a.status === 'draft').length,
    totalViews: articles.reduce((sum, a) => sum + (a.viewCount ?? 0), 0),
    breakingCount: articles.filter((a) => a.isBreaking && a.status === 'published').length,
  };
}

export async function listEditorCategories(): Promise<RedactionCategory[]> {
  const response = await strapiFetch<{ data: StrapiEntity[] }>('/categories', {
    sort: ['name:asc'],
    pagination: { pageSize: 50 },
  });

  return response.data.map((c) => ({
    documentId: c.documentId,
    name: c.name as string,
    slug: c.slug as string,
    color: c.color as string | undefined,
  }));
}

export async function uploadEditorImage(
  user: RedactionUser,
  file: File
): Promise<{ id: number; url: string }> {
  await resolveAuthorForUser(user);

  if (!STRAPI_TOKEN) {
    throw new Error('STRAPI_API_TOKEN manquant');
  }

  const form = new FormData();
  form.append('files', file);

  const res = await fetch(`${getStrapiUrl()}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: form,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Upload échoué (${res.status})`);
  }

  const data = (await res.json()) as { id: number; url: string }[];
  const media = data[0];
  if (!media?.id) throw new Error('Upload sans identifiant');

  return { id: media.id, url: media.url };
}

export async function loginRedactionUser(
  identifier: string,
  password: string
): Promise<{ jwt: string; user: RedactionUser }> {
  const res = await fetch(`${getStrapiUrl()}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier.trim(), password }),
    cache: 'no-store',
  });

  const data = (await res.json()) as {
    jwt?: string;
    user?: { id: number; email: string; username: string };
    error?: { message?: string };
  };

  if (!res.ok || !data.jwt || !data.user?.email) {
    throw new RedactionAuthError('Identifiants incorrects');
  }

  return {
    jwt: data.jwt,
    user: {
      id: data.user.id,
      email: data.user.email.toLowerCase(),
      username: data.user.username,
    },
  };
}
