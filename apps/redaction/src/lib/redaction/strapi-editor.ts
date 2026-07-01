import { cache } from 'react';
import { cookies } from 'next/headers';
import qs from 'qs';
import { getStrapiUrl, REDACTION_COOKIE } from '@/lib/redaction/config';
import type {
  ArticleEditorPayload,
  FcmSubscriptionPayload,
  ListEditorArticlesOptions,
  ListEditorArticlesResult,
  RedactionArticle,
  RedactionAuthor,
  RedactionCategory,
  RedactionComment,
  RedactionMediaItem,
  RedactionStats,
  RedactionUser,
} from '@/lib/redaction/types';
import { calculateReadingTime, generateSeoDescription, generateSeoTitle, slugify } from '@/lib/utils';
import { isLiveRedactionArticle } from '@/lib/redaction/status-label';

export { isLiveRedactionArticle };

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface StrapiEntity {
  id: number;
  documentId: string;
  [key: string]: unknown;
}

interface StrapiListResponse<T = StrapiEntity> {
  data: T[];
  meta: { pagination: { page: number; pageCount: number; total: number } };
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
    throw new Error(`Réponse Strapi invalide: ${text.slice(0, 120)}`);
  }
}

export async function getRedactionJwt(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REDACTION_COOKIE)?.value ?? null;
}

async function verifyUsersPermissionsUser(jwt: string): Promise<RedactionUser | null> {
  const res = await fetch(`${getStrapiUrl()}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id: number; email: string; username: string };
  if (!user.email) return null;

  const strapiRoleName = await fetchUsersPermissionsRoleName(user.id, jwt);
  return mapUsersPermissionsToRedactionUser(user, strapiRoleName);
}

function normalizeStrapiRoleName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const SUPER_ADMIN_ROLE_NAMES = new Set(
  [
    'super admin',
    'superadmin',
    'super-admin',
    'strapi-super-admin',
    'administrateur',
    'admin',
    ...(process.env.REDACTION_SUPER_ADMIN_ROLES?.split(',').map((s) => s.trim()).filter(Boolean) ??
      []),
  ].map(normalizeStrapiRoleName)
);

const EDITOR_ROLE_NAMES = new Set(
  [
    'editor',
    'editeur',
    'éditeur',
    'strapi-editor',
    'redacteur',
    'rédacteur',
    ...(process.env.REDACTION_EDITOR_ROLES?.split(',').map((s) => s.trim()).filter(Boolean) ??
      []),
  ].map(normalizeStrapiRoleName)
);

function isSuperAdminStrapiRoleName(roleName?: string): boolean {
  if (!roleName) return false;
  return SUPER_ADMIN_ROLE_NAMES.has(normalizeStrapiRoleName(roleName));
}

function isEditorStrapiRoleName(roleName?: string): boolean {
  if (!roleName) return false;
  return EDITOR_ROLE_NAMES.has(normalizeStrapiRoleName(roleName));
}

function mapUsersPermissionsToRedactionUser(
  user: { id: number; email: string; username: string },
  strapiRoleName?: string
): RedactionUser {
  let role: RedactionUser['role'] = 'author';
  if (isSuperAdminStrapiRoleName(strapiRoleName)) {
    role = 'admin';
  } else if (isEditorStrapiRoleName(strapiRoleName)) {
    role = 'editor';
  }

  return {
    id: user.id,
    email: user.email.toLowerCase(),
    username: user.username,
    role,
    strapiRoleName,
  };
}

function mapAdminPanelToRedactionUser(
  admin: { id: number; email: string; username: string },
  strapiRoleNames: string[]
): RedactionUser {
  const normalized = strapiRoleNames.map(normalizeStrapiRoleName);
  let role: RedactionUser['role'] = 'admin';

  if (normalized.some((name) => SUPER_ADMIN_ROLE_NAMES.has(name))) {
    role = 'admin';
  } else if (normalized.some((name) => EDITOR_ROLE_NAMES.has(name))) {
    role = 'editor';
  } else if (normalized.length > 0) {
    role = 'editor';
  }

  return {
    id: admin.id,
    email: admin.email.toLowerCase(),
    username: admin.username,
    role,
    strapiRoleName: strapiRoleNames.join(', ') || undefined,
  };
}

async function fetchUsersPermissionsRoleName(
  userId: number,
  jwt?: string
): Promise<string | undefined> {
  try {
    const response = await strapiFetch<{
      role?: { name?: string };
    }>(`/users/${userId}`, { populate: { role: true } });
    if (response.role?.name) return response.role.name;
  } catch {
    // token API ou populate indisponible — repli JWT ci-dessous
  }

  if (!jwt) return undefined;

  try {
    const res = await fetch(`${getStrapiUrl()}/api/users/me?populate=role`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { role?: { name?: string } };
    return body.role?.name;
  } catch {
    return undefined;
  }
}

async function verifyAdminUser(jwt: string): Promise<RedactionUser | null> {
  const res = await fetch(`${getStrapiUrl()}/admin/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const body = (await res.json()) as {
    data?: {
      id: number;
      email: string;
      firstname?: string;
      lastname?: string;
      username?: string;
      roles?: Array<{ name?: string; code?: string }>;
    };
  };
  const admin = body.data;
  if (!admin?.email) return null;

  const displayName = [admin.firstname, admin.lastname].filter(Boolean).join(' ').trim();
  const roleNames =
    admin.roles?.map((role) => role.name || role.code || '').filter(Boolean) ?? [];

  return mapAdminPanelToRedactionUser(
    {
      id: admin.id,
      email: admin.email,
      username: admin.username || displayName || admin.email.split('@')[0],
    },
    roleNames
  );
}

export async function verifyRedactionUser(jwt: string): Promise<RedactionUser | null> {
  try {
    const fromUsers = await verifyUsersPermissionsUser(jwt);
    if (fromUsers) return fromUsers;
    return await verifyAdminUser(jwt);
  } catch {
    return null;
  }
}

export const requireRedactionUser = cache(async (): Promise<RedactionUser> => {
  const jwt = await getRedactionJwt();
  if (!jwt) throw new RedactionAuthError('Non connecté');
  const user = await verifyRedactionUser(jwt);
  if (!user) throw new RedactionAuthError('Session expirée');
  return user;
});

export function isRedactionSuperAdmin(user: RedactionUser): boolean {
  return user.role === 'admin';
}

/** Peut publier au nom d'un autre rédacteur (rôle Super Admin Strapi uniquement). */
export function canAssignArticleAuthor(user: RedactionUser): boolean {
  return user.role === 'admin';
}

/** Peut supprimer n'importe quel article (publié, planifié, brouillon). */
export function canDeleteAnyArticle(user: RedactionUser): boolean {
  return user.role === 'admin';
}

export function canDeleteArticle(user: RedactionUser, article: RedactionArticle): boolean {
  if (canDeleteAnyArticle(user)) return true;
  return article.status === 'draft' && !isLiveRedactionArticle(article);
}

export async function requireRedactionSuperAdmin(): Promise<RedactionUser> {
  const user = await requireRedactionUser();
  if (!isRedactionSuperAdmin(user)) {
    throw new RedactionAuthError('Accès réservé aux administrateurs');
  }
  return user;
}

export class RedactionAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedactionAuthError';
  }
}

function resolveArticleStatus(entity: StrapiEntity): RedactionArticle['status'] {
  const raw = (entity.status as RedactionArticle['status']) ?? 'draft';
  const publishedAt = entity.publishedAt as string | undefined;
  const scheduledAt = entity.scheduledAt as string | undefined;

  if (raw === 'archived') return 'archived';

  if (!publishedAt) {
    if (raw === 'scheduled' && scheduledAt && new Date(scheduledAt).getTime() > Date.now()) {
      return 'scheduled';
    }
    return 'draft';
  }

  if (raw === 'scheduled' && scheduledAt && new Date(scheduledAt).getTime() > Date.now()) {
    return 'scheduled';
  }

  return 'published';
}

function mapArticle(entity: StrapiEntity): RedactionArticle {
  const category = entity.category as StrapiEntity | null | undefined;
  const secondaryCategories = (entity.secondaryCategories as StrapiEntity[] | null | undefined) ?? [];
  const tags = (entity.tags as StrapiEntity[] | null | undefined) ?? [];
  const featuredImage = entity.featuredImage as StrapiEntity | null | undefined;

  return {
    documentId: entity.documentId,
    title: entity.title as string,
    slug: entity.slug as string,
    excerpt: entity.excerpt as string,
    content: entity.content as string,
    seoTitle: entity.seoTitle as string | undefined,
    seoDescription: entity.seoDescription as string | undefined,
    canonicalUrl: entity.canonicalUrl as string | undefined,
    status: resolveArticleStatus(entity),
    isBreaking: (entity.isBreaking as boolean) ?? false,
    isFeatured: (entity.isFeatured as boolean) ?? false,
    viewCount: (entity.viewCount as number) ?? 0,
    readingTime: (entity.readingTime as number) ?? 3,
    publishedAt: entity.publishedAt as string | undefined,
    wpPublishedAt: entity.wpPublishedAt as string | undefined,
    scheduledAt: entity.scheduledAt as string | undefined,
    updatedAt: entity.updatedAt as string,
    category: category
      ? {
          documentId: category.documentId,
          name: category.name as string,
          slug: category.slug as string,
          color: category.color as string | undefined,
        }
      : undefined,
    secondaryCategories: secondaryCategories.map((item) => ({
      documentId: item.documentId,
      name: item.name as string,
      slug: item.slug as string,
      color: item.color as string | undefined,
    })),
    tagNames: tags.map((item) => item.name as string).filter(Boolean),
    featuredImage: featuredImage?.url
      ? {
          id: featuredImage.id,
          url: featuredImage.url as string,
          alternativeText: featuredImage.alternativeText as string | undefined,
        }
      : undefined,
    author: (() => {
      const authorEntity = entity.author as StrapiEntity | null | undefined;
      if (!authorEntity?.documentId) return undefined;
      return {
        documentId: authorEntity.documentId,
        name: authorEntity.name as string,
        slug: authorEntity.slug as string,
      };
    })(),
  };
}

const resolveAuthorForUser = cache(async (user: RedactionUser): Promise<RedactionAuthor> => {
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
});

export const getEditorProfile = cache(async function getEditorProfile(user: RedactionUser): Promise<{
  user: RedactionUser;
  author: RedactionAuthor;
  isSuperAdmin: boolean;
  canAssignAuthor: boolean;
  canDeleteAnyArticle: boolean;
  canManageAllArticles: boolean;
}> {
  const author = await resolveAuthorForUser(user);
  const isSuperAdmin = isRedactionSuperAdmin(user);
  return {
    user,
    author,
    isSuperAdmin,
    canAssignAuthor: canAssignArticleAuthor(user),
    canDeleteAnyArticle: canDeleteAnyArticle(user),
    canManageAllArticles: isSuperAdmin,
  };
});

const PLACEHOLDER_TITLE = 'Sans titre';

function isPlaceholderTitle(title: string | undefined): boolean {
  return !title?.trim() || title.trim().toLowerCase() === PLACEHOLDER_TITLE.toLowerCase();
}

function isGenericSlug(slug: string | undefined): boolean {
  if (!slug?.trim()) return true;
  return ['article', 'articles', 'post', 'nouveau', 'brouillon', 'sans-titre'].includes(
    slug.trim().toLowerCase()
  );
}

function generateArticleSlug(title: string): string {
  const base = slugify(title).slice(0, 100);
  return base || `article-${Date.now().toString(36)}`;
}

function resolveArticleSlug(
  existing: { slug?: string; title?: string },
  newTitle: string
): string {
  const title = newTitle.trim();
  if (isGenericSlug(existing.slug)) return generateArticleSlug(title);
  if (
    isPlaceholderTitle(existing.title) &&
    !isPlaceholderTitle(title) &&
    existing.slug?.trim().toLowerCase() === slugify(PLACEHOLDER_TITLE)
  ) {
    return generateArticleSlug(title);
  }
  return existing.slug!.trim();
}

async function buildListAuthorFilter(
  user: RedactionUser,
  authorDocumentId?: string
): Promise<Record<string, unknown>> {
  if (isRedactionSuperAdmin(user)) {
    if (authorDocumentId?.trim()) {
      return { author: { documentId: { $eq: authorDocumentId.trim() } } };
    }
    return {};
  }

  const author = await resolveAuthorForUser(user);
  return { author: { documentId: { $eq: author.documentId } } };
}

async function fetchAllArticleEntities(
  listParams: Record<string, unknown>,
  authorFilter: Record<string, unknown>,
  publicationStatus: 'published' | 'draft',
  extraFilters?: Record<string, unknown>
): Promise<StrapiEntity[]> {
  const pageSize = 100;
  let page = 1;
  const all: StrapiEntity[] = [];

  while (true) {
    const response = await strapiFetch<StrapiListResponse>('/articles', {
      ...listParams,
      filters: { ...authorFilter, ...extraFilters },
      pagination: { page, pageSize },
      status: publicationStatus,
    });
    all.push(...response.data);
    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page += 1;
  }

  return all;
}

async function getStrapiArticleTotal(
  authorFilter: Record<string, unknown>,
  publicationStatus: 'published' | 'draft',
  extraFilters?: Record<string, unknown>
): Promise<number> {
  const response = await strapiFetch<StrapiListResponse>('/articles', {
    filters: { ...authorFilter, ...extraFilters },
    pagination: { page: 1, pageSize: 1 },
    status: publicationStatus,
  });
  return response.meta?.pagination?.total ?? 0;
}

async function fetchArticleEntitiesWindow(
  listParams: Record<string, unknown>,
  authorFilter: Record<string, unknown>,
  publicationStatus: 'published' | 'draft',
  windowSize: number,
  extraFilters?: Record<string, unknown>
): Promise<StrapiEntity[]> {
  const response = await strapiFetch<StrapiListResponse>('/articles', {
    ...listParams,
    filters: { ...authorFilter, ...extraFilters },
    pagination: { page: 1, pageSize: windowSize },
    status: publicationStatus,
  });
  return response.data;
}

async function fetchPublishedDocumentIds(
  authorFilter: Record<string, unknown>
): Promise<Set<string>> {
  const pageSize = 250;
  let page = 1;
  const ids = new Set<string>();

  while (true) {
    const response = await strapiFetch<StrapiListResponse>('/articles', {
      filters: authorFilter,
      fields: ['documentId'],
      pagination: { page, pageSize },
      status: 'published',
    });
    for (const item of response.data) {
      if (item.documentId) ids.add(item.documentId);
    }
    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page += 1;
  }

  return ids;
}

/** Évite les requêtes $notIn énormes (timeout / URL trop longue sur gros catalogues). */
const MAX_PUBLISHED_IDS_FOR_NOT_IN = 200;

async function getPublishedIdsForExclusion(
  authorFilter: Record<string, unknown>
): Promise<Set<string> | null> {
  const publishedCount = await getStrapiArticleTotal(authorFilter, 'published');
  if (publishedCount > MAX_PUBLISHED_IDS_FOR_NOT_IN) return null;
  return fetchPublishedDocumentIds(authorFilter);
}

async function fetchPublishedEngagementTotals(
  authorFilter: Record<string, unknown>
): Promise<{ totalViews: number; breakingCount: number }> {
  const publishedCount = await getStrapiArticleTotal(authorFilter, 'published');
  const pageSize = 100;
  const maxPages = publishedCount > 500 ? 5 : Math.ceil(publishedCount / pageSize) || 1;
  let page = 1;
  let totalViews = 0;
  let breakingCount = 0;

  while (page <= maxPages) {
    const response = await strapiFetch<StrapiListResponse>('/articles', {
      filters: authorFilter,
      fields: ['viewCount', 'isBreaking', 'publishedAt'],
      pagination: { page, pageSize },
      status: 'published',
    });

    for (const entity of response.data) {
      const article = mapArticle(entity);
      if (!isLiveRedactionArticle(article)) continue;
      totalViews += article.viewCount ?? 0;
      if (article.isBreaking) breakingCount += 1;
    }

    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page += 1;
  }

  return { totalViews, breakingCount };
}

async function listEditorArticlesPage(
  authorFilter: Record<string, unknown>,
  listParams: Record<string, unknown>,
  status: 'draft' | 'published' | 'scheduled' | 'all',
  page: number,
  pageSize: number
): Promise<ListEditorArticlesResult> {
  const start = (page - 1) * pageSize;
  const windowSize = page * pageSize;

  if (status === 'published') {
    const entities = await fetchArticleEntitiesWindow(
      listParams,
      authorFilter,
      'published',
      windowSize
    );
    const articles = sortArticlesByUpdated(
      entities.map(mapArticle).filter(isLiveRedactionArticle)
    );
    const total = await getStrapiArticleTotal(authorFilter, 'published');
    return {
      articles: articles.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  if (status === 'scheduled') {
    const response = await strapiFetch<StrapiListResponse>('/articles', {
      ...listParams,
      filters: { ...authorFilter, status: { $eq: 'scheduled' } },
      pagination: { page, pageSize },
      status: 'draft',
    });
    const articles = response.data
      .map(mapArticle)
      .filter((article) => article.status === 'scheduled');
    const total = await getStrapiArticleTotal(authorFilter, 'draft', {
      status: { $eq: 'scheduled' },
    });
    return {
      articles,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  const publishedIds = await getPublishedIdsForExclusion(authorFilter);
  const publishedIdList = publishedIds ? [...publishedIds] : [];

  if (status === 'draft') {
    const draftFilter: Record<string, unknown> = {
      ...authorFilter,
      status: { $eq: 'draft' },
      ...(publishedIdList.length > 0 ? { documentId: { $notIn: publishedIdList } } : {}),
    };
    const response = await strapiFetch<StrapiListResponse>('/articles', {
      ...listParams,
      filters: draftFilter,
      pagination: { page, pageSize },
      status: 'draft',
    });
    let articles = response.data
      .map(mapArticle)
      .filter((article) => article.status === 'draft' && !isLiveRedactionArticle(article));
    const total = publishedIds
      ? await getStrapiArticleTotal(authorFilter, 'draft', draftFilter)
      : await getStrapiArticleTotal(authorFilter, 'draft', { status: { $eq: 'draft' } });
    return {
      articles,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  const [pubEntities, draftEntities] = await Promise.all([
    fetchArticleEntitiesWindow(listParams, authorFilter, 'published', windowSize),
    fetchArticleEntitiesWindow(
      listParams,
      authorFilter,
      'draft',
      windowSize,
      publishedIdList.length > 0
        ? { documentId: { $notIn: publishedIdList }, status: { $eq: 'draft' } }
        : { status: { $eq: 'draft' } }
    ),
  ]);

  const merged = new Map<string, RedactionArticle>();
  for (const item of draftEntities) {
    if (publishedIds && publishedIds.has(item.documentId)) continue;
    const article = mapArticle(item);
    if (article.status !== 'draft' || isLiveRedactionArticle(article)) continue;
    merged.set(item.documentId, article);
  }
  for (const item of pubEntities) {
    merged.set(item.documentId, mapArticle(item));
  }

  const sorted = sortArticlesByUpdated([...merged.values()]);
  const [pubTotal, draftTotal, scheduledTotal] = await Promise.all([
    getStrapiArticleTotal(authorFilter, 'published'),
    getStrapiArticleTotal(authorFilter, 'draft', { status: { $eq: 'draft' } }),
    getStrapiArticleTotal(authorFilter, 'draft', { status: { $eq: 'scheduled' } }),
  ]);
  const total = publishedIds
    ? pubTotal +
      (await getStrapiArticleTotal(authorFilter, 'draft', {
        status: { $eq: 'draft' },
        ...(publishedIdList.length > 0 ? { documentId: { $notIn: publishedIdList } } : {}),
      }))
    : pubTotal + draftTotal + scheduledTotal;

  return {
    articles: sorted.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

function filterArticlesByStatus(
  articles: RedactionArticle[],
  status: 'draft' | 'published' | 'scheduled' | 'all'
): RedactionArticle[] {
  if (status === 'published') {
    return articles.filter(isLiveRedactionArticle);
  }
  if (status === 'scheduled') {
    return articles.filter((article) => article.status === 'scheduled');
  }
  if (status === 'draft') {
    return articles.filter(
      (article) => article.status === 'draft' && !isLiveRedactionArticle(article)
    );
  }
  return articles;
}

function sortArticlesByUpdated(articles: RedactionArticle[]): RedactionArticle[] {
  return articles.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

async function mergeEditorArticles(
  authorFilter: Record<string, unknown>,
  listParams: Record<string, unknown>,
  status: 'draft' | 'published' | 'scheduled' | 'all'
): Promise<RedactionArticle[]> {
  const sortByUpdated = (articles: RedactionArticle[]) => sortArticlesByUpdated(articles);

  if (status === 'published') {
    const published = await fetchAllArticleEntities(listParams, authorFilter, 'published');
    return sortByUpdated(published.map(mapArticle).filter(isLiveRedactionArticle));
  }

  if (status === 'scheduled') {
    const drafts = await fetchAllArticleEntities(
      listParams,
      authorFilter,
      'draft',
      { status: { $eq: 'scheduled' } }
    );
    return sortByUpdated(
      drafts.map(mapArticle).filter((article) => article.status === 'scheduled')
    );
  }

  if (status === 'draft') {
    const [published, drafts] = await Promise.all([
      fetchAllArticleEntities(listParams, authorFilter, 'published'),
      fetchAllArticleEntities(listParams, authorFilter, 'draft', { status: { $eq: 'draft' } }),
    ]);
    const publishedIds = new Set(published.map((item) => item.documentId));
    return sortByUpdated(
      drafts
        .filter((item) => !publishedIds.has(item.documentId))
        .map(mapArticle)
        .filter((article) => article.status === 'draft' && !isLiveRedactionArticle(article))
    );
  }

  const [published, drafts] = await Promise.all([
    fetchAllArticleEntities(listParams, authorFilter, 'published'),
    fetchAllArticleEntities(listParams, authorFilter, 'draft'),
  ]);
  const publishedIds = new Set(published.map((item) => item.documentId));
  const merged = new Map<string, RedactionArticle>();

  for (const item of drafts) {
    if (!publishedIds.has(item.documentId)) {
      merged.set(item.documentId, mapArticle(item));
    }
  }
  for (const item of published) {
    merged.set(item.documentId, mapArticle(item));
  }

  return sortByUpdated([...merged.values()]);
}

export async function listEditorArticles(
  user: RedactionUser,
  status: 'draft' | 'published' | 'scheduled' | 'all' = 'all',
  options?: ListEditorArticlesOptions
): Promise<ListEditorArticlesResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(6, options?.pageSize ?? 20));
  const authorFilter = await buildListAuthorFilter(user, options?.authorDocumentId);

  const populate = options?.omitContent
    ? { category: true, featuredImage: true, author: true }
    : {
        category: true,
        secondaryCategories: true,
        tags: true,
        featuredImage: true,
        author: true,
      };
  const listParams = {
    populate,
    sort: ['updatedAt:desc'] as string[],
    ...(options?.omitContent
      ? {
          fields: [
            'title',
            'slug',
            'excerpt',
            'status',
            'isBreaking',
            'isFeatured',
            'viewCount',
            'readingTime',
            'publishedAt',
            'wpPublishedAt',
            'scheduledAt',
            'updatedAt',
          ],
        }
      : {}),
  };

  if (options?.paginate === false) {
    const merged = await mergeEditorArticles(authorFilter, listParams, status ?? 'all');
    const filtered = filterArticlesByStatus(merged, status ?? 'all');
    const total = filtered.length;
    return {
      articles: filtered,
      pagination: { page: 1, pageSize: total, total, pageCount: 1 },
    };
  }

  return listEditorArticlesPage(
    authorFilter,
    listParams,
    status ?? 'all',
    page,
    pageSize
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
        populate: { category: true, secondaryCategories: true, tags: true, featuredImage: true, author: true },
        status: publicationStatus,
      });

      const articleAuthor = response.data.author as StrapiEntity | undefined;
      if (
        !isRedactionSuperAdmin(user) &&
        articleAuthor?.documentId !== author.documentId
      ) {
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

const TAG_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'et', 'en', 'un', 'une', 'pour', 'dans', 'sur', 'par',
  'au', 'aux', 'ce', 'cette', 'son', 'sa', 'ses', 'leur', 'leurs', 'qui', 'que', 'est', 'sont',
  'avec', 'entre', 'plus', 'moins', 'pas', 'se', 'il', 'elle', 'ils', 'elles', 'the', 'and',
  'une', 'ont', 'été', 'ete', 'être', 'etre', 'aux', 'ces', 'cette', 'comme', 'mais', 'ou',
]);

function extractTagCandidates(title: string, excerpt?: string): string[] {
  const text = `${title} ${excerpt ?? ''}`;
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const match of text.matchAll(/\b[A-Z]{2,}\b/g)) {
    const name = match[0];
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(name);
    }
  }

  for (const word of text.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/)) {
    const cleaned = word.trim();
    if (cleaned.length < 3) continue;
    const key = cleaned.toLowerCase();
    if (TAG_STOP_WORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    candidates.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase());
    if (candidates.length >= 6) break;
  }

  return candidates.slice(0, 5);
}

async function findOrCreateTag(name: string): Promise<string | null> {
  const slug = slugify(name);
  if (!slug) return null;

  const existing = await strapiFetch<{ data: StrapiEntity[] }>('/tags', {
    filters: { slug: { $eq: slug } },
    pagination: { pageSize: 1 },
  });
  if (existing.data[0]) return existing.data[0].documentId;

  try {
    const created = await strapiFetch<{ data: StrapiEntity }>('/tags', undefined, {
      method: 'POST',
      body: JSON.stringify({ data: { name, slug } }),
    });
    return created.data.documentId;
  } catch {
    return null;
  }
}

async function syncArticleTags(options: {
  title: string;
  excerpt?: string;
  tagNames?: string[];
}): Promise<string[]> {
  if (options.tagNames) {
    const normalized = options.tagNames.map((name) => name.trim()).filter(Boolean).slice(0, 12);
    const ids = await Promise.all(normalized.map((name) => findOrCreateTag(name)));
    return ids.filter((id): id is string => Boolean(id));
  }

  const candidates = extractTagCandidates(options.title, options.excerpt);
  const ids = await Promise.all(candidates.map((name) => findOrCreateTag(name)));
  return ids.filter((id): id is string => Boolean(id));
}

function normalizeEditorContent(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '<p></p>') return '';

  // HTML issu de l'éditeur riche — conserver tel quel
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  // Texte brut (anciens articles) — les paragraphes sont ajoutés à l'affichage
  return trimmed.replace(/\r\n/g, '\n');
}

/**
 * Force brouillon si l'éditeur envoie l'en-tête X-Redaction-Draft (autosave).
 */
export function applyDraftSaveHeader(
  payload: Partial<ArticleEditorPayload>,
  request: Request
): Partial<ArticleEditorPayload> {
  if (request.headers.get('x-redaction-draft') !== '1') return payload;
  return { ...payload, draftOnly: true, publish: false };
}

function isFutureSchedule(payload: Partial<ArticleEditorPayload>): boolean {
  const at = payload.scheduledAt?.trim();
  if (!at || payload.publish === true) return false;
  return new Date(at).getTime() > Date.now();
}

export function isExplicitEditorPublish(payload: Partial<ArticleEditorPayload>): boolean {
  return payload.publish === true && payload.draftOnly !== true;
}

/**
 * Normalise les intentions de sauvegarde : autosave et brouillons ne doivent jamais publier.
 * POST sans publication/planification explicite → brouillon uniquement.
 */
export function normalizeEditorSavePayload<T extends Partial<ArticleEditorPayload>>(
  payload: T,
  options?: { defaultToDraft?: boolean; isUpdate?: boolean }
): T {
  if (isExplicitEditorPublish(payload)) {
    return { ...payload, draftOnly: false, publish: true };
  }

  if (isFutureSchedule(payload)) {
    return {
      ...payload,
      draftOnly: false,
      publish: false,
    };
  }

  const isDraftIntent =
    payload.draftOnly === true || (options?.defaultToDraft === true && !isExplicitEditorPublish(payload));

  if (isDraftIntent) {
    return {
      ...payload,
      draftOnly: true,
      publish: false,
      ...(options?.isUpdate ? {} : { scheduledAt: null }),
    };
  }

  return payload;
}

function resolveArticleSaveMode(payload: Partial<ArticleEditorPayload>): {
  strapiStatus: 'draft' | 'published';
  customStatus: RedactionArticle['status'];
  scheduledAt: string | null;
} | null {
  if (payload.draftOnly) {
    return { strapiStatus: 'draft', customStatus: 'draft', scheduledAt: null };
  }

  if (payload.publish === undefined && payload.scheduledAt === undefined) {
    return null;
  }

  const scheduledAt = payload.scheduledAt?.trim() || null;
  const scheduleFuture =
    scheduledAt && payload.publish !== true && new Date(scheduledAt).getTime() > Date.now();

  if (scheduleFuture) {
    return { strapiStatus: 'draft', customStatus: 'scheduled', scheduledAt };
  }

  if (payload.publish) {
    return { strapiStatus: 'published', customStatus: 'published', scheduledAt: null };
  }

  return { strapiStatus: 'draft', customStatus: 'draft', scheduledAt: null };
}

function buildArticleData(
  payload: Partial<ArticleEditorPayload>,
  author: RedactionAuthor,
  slug?: string,
  saveMode?: ReturnType<typeof resolveArticleSaveMode>,
  tagIds?: string[]
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  let resolvedTitle = '';
  let resolvedContent = '';
  let resolvedExcerpt = '';

  if (saveMode) {
    data.status = saveMode.customStatus;
    data.scheduledAt = saveMode.scheduledAt;
  }

  if (slug) data.slug = slug;
  if (payload.title !== undefined) {
    resolvedTitle = payload.title.trim();
    data.title = resolvedTitle;
  }
  if (payload.excerpt !== undefined) {
    resolvedExcerpt = payload.excerpt.trim().slice(0, 500);
    data.excerpt = resolvedExcerpt;
  }
  if (payload.content !== undefined) {
    resolvedContent = normalizeEditorContent(payload.content);
    data.content = resolvedContent;
    data.readingTime = calculateReadingTime(resolvedContent);
  }
  if (payload.categoryDocumentIds !== undefined) {
    const categoryIds = payload.categoryDocumentIds.map((id) => id.trim()).filter(Boolean);
    if (categoryIds[0]) data.category = categoryIds[0];
    data.secondaryCategories = categoryIds.slice(1);
  }
  if (payload.seoTitle !== undefined) {
    const seoTitle = payload.seoTitle.trim();
    if (seoTitle) data.seoTitle = seoTitle.slice(0, 70);
  }
  if (payload.seoDescription !== undefined) {
    const seoDescription = payload.seoDescription.trim();
    if (seoDescription) data.seoDescription = seoDescription.slice(0, 160);
  }
  if (payload.canonicalUrl !== undefined) {
    data.canonicalUrl = payload.canonicalUrl.trim() || null;
  }
  if (payload.featuredImageId !== undefined) data.featuredImage = payload.featuredImageId;
  if (payload.isBreaking !== undefined) data.isBreaking = payload.isBreaking;
  if (author.documentId) data.author = author.documentId;
  if (tagIds !== undefined) data.tags = tagIds;

  if (!data.seoTitle && (resolvedTitle || resolvedContent)) {
    data.seoTitle = generateSeoTitle(resolvedTitle, resolvedContent);
  }
  if (!data.seoDescription) {
    if (resolvedContent) {
      data.seoDescription = generateSeoDescription(resolvedContent);
    } else if (resolvedExcerpt) {
      data.seoDescription = resolvedExcerpt.slice(0, 160);
    }
  }

  return data;
}

export async function listRedactionAuthors(user: RedactionUser): Promise<RedactionAuthor[]> {
  if (!canAssignArticleAuthor(user)) {
    throw new RedactionAuthError('Accès réservé aux super administrateurs');
  }

  const response = await strapiFetch<{ data: StrapiEntity[] }>('/authors', {
    sort: ['name:asc'],
    pagination: { pageSize: 100 },
  });

  return response.data.map((item) => ({
    documentId: item.documentId,
    name: item.name as string,
    slug: item.slug as string,
  }));
}

async function resolveAuthorByDocumentId(documentId: string): Promise<RedactionAuthor | null> {
  try {
    const response = await strapiFetch<{ data: StrapiEntity }>(`/authors/${documentId}`);
    const entity = response.data;
    if (!entity?.documentId) return null;
    return {
      documentId: entity.documentId,
      name: entity.name as string,
      slug: entity.slug as string,
    };
  } catch {
    return null;
  }
}

async function resolveAuthorForArticleSave(
  user: RedactionUser,
  payload: Partial<ArticleEditorPayload>,
  saveMode: ReturnType<typeof resolveArticleSaveMode> | null
): Promise<RedactionAuthor> {
  const ownAuthor = await resolveAuthorForUser(user);
  const publishing =
    saveMode?.strapiStatus === 'published' || saveMode?.customStatus === 'scheduled';
  const requestedAuthorId = payload.authorDocumentId?.trim();

  if (!publishing || !requestedAuthorId || requestedAuthorId === ownAuthor.documentId) {
    return ownAuthor;
  }

  if (!canAssignArticleAuthor(user)) {
    return ownAuthor;
  }

  const targetAuthor = await resolveAuthorByDocumentId(requestedAuthorId);
  if (!targetAuthor) {
    throw new RedactionAuthError('Rédacteur introuvable');
  }

  return targetAuthor;
}

export async function deleteEditorArticle(
  user: RedactionUser,
  documentId: string
): Promise<void> {
  const article = await getEditorArticle(user, documentId);
  if (!article) throw new RedactionAuthError('Article introuvable');
  if (!canDeleteArticle(user, article)) {
    throw new RedactionAuthError('Seuls les brouillons peuvent être supprimés');
  }

  await strapiFetch(`/articles/${documentId}`, undefined, { method: 'DELETE' });
}

export async function createEditorArticle(
  user: RedactionUser,
  payload: ArticleEditorPayload
): Promise<RedactionArticle> {
  const normalized = normalizeEditorSavePayload(payload, { defaultToDraft: true });
  const slug = generateArticleSlug(normalized.title);
  const saveMode = normalized.draftOnly
    ? { strapiStatus: 'draft' as const, customStatus: 'draft' as const, scheduledAt: null }
    : resolveArticleSaveMode(normalized) ?? {
        strapiStatus: 'draft' as const,
        customStatus: 'draft' as const,
        scheduledAt: null,
      };
  const author = await resolveAuthorForArticleSave(user, normalized, saveMode);
  const tagIds =
    saveMode.strapiStatus === 'published'
      ? await syncArticleTags({
          title: normalized.title,
          excerpt: normalized.excerpt,
          tagNames: normalized.tagNames,
        })
      : undefined;
  const endpoint =
    saveMode.strapiStatus === 'published' ? '/articles?status=published' : '/articles';

  const response = await strapiFetch<{ data: StrapiEntity }>(endpoint, undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: buildArticleData(normalized, author, slug, saveMode, tagIds),
    }),
  });

  return mapArticle(response.data);
}

export async function updateEditorArticle(
  user: RedactionUser,
  documentId: string,
  payload: Partial<ArticleEditorPayload>
): Promise<RedactionArticle> {
  const normalized = normalizeEditorSavePayload(payload, { isUpdate: true });
  const existing = await getEditorArticle(user, documentId);
  if (!existing) throw new RedactionAuthError('Article introuvable');

  const isDraftOnly = Boolean(normalized.draftOnly);
  const saveMode = isDraftOnly ? null : resolveArticleSaveMode(normalized);
  const author = await resolveAuthorForArticleSave(user, normalized, saveMode);
  // Autosave / brouillon : toujours la version draft (?status=published publierait l'article).
  const statusParam: 'draft' | 'published' = isDraftOnly
    ? 'draft'
    : (saveMode?.strapiStatus ??
      (isLiveRedactionArticle(existing) ? 'published' : 'draft'));

  const title = normalized.title?.trim() || existing.title;
  const excerpt = normalized.excerpt?.trim() || existing.excerpt;
  const slug = isDraftOnly ? undefined : resolveArticleSlug(existing, title);

  const publishing = saveMode?.strapiStatus === 'published';
  const tagIds = publishing
    ? await syncArticleTags({
        title,
        excerpt,
        tagNames: normalized.tagNames ?? existing.tagNames,
      })
    : undefined;

  const response = await strapiFetch<{ data: StrapiEntity }>(
    `/articles/${documentId}?status=${statusParam}`,
    undefined,
    {
      method: 'PUT',
      body: JSON.stringify({
        data: buildArticleData(normalized, author, slug, saveMode, tagIds),
      }),
    }
  );

  return mapArticle(response.data);
}

export async function publishDueScheduledArticles(): Promise<{
  published: number;
  documentIds: string[];
}> {
  const now = new Date().toISOString();
  const response = await strapiFetch<{ data: StrapiEntity[] }>('/articles', {
    filters: {
      status: { $eq: 'scheduled' },
      scheduledAt: { $lte: now },
    },
    populate: { category: true },
    pagination: { pageSize: 50 },
    status: 'draft',
  });

  const documentIds: string[] = [];

  for (const article of response.data) {
    const title = (article.title as string | undefined)?.trim() ?? '';
    const existingSlug = (article.slug as string | undefined)?.trim() ?? '';
    const publishData: Record<string, unknown> = {
      status: 'published',
      scheduledAt: null,
    };
    if (title && (isGenericSlug(existingSlug) || existingSlug === slugify(PLACEHOLDER_TITLE))) {
      publishData.slug = generateArticleSlug(title);
    }

    await strapiFetch(`/articles/${article.documentId}?status=published`, undefined, {
      method: 'PUT',
      body: JSON.stringify({ data: publishData }),
    });
    documentIds.push(article.documentId);
  }

  return { published: documentIds.length, documentIds };
}

export function computeEditorStats(articles: RedactionArticle[]): RedactionStats {
  return {
    totalArticles: articles.length,
    publishedCount: articles.filter((a) => isLiveRedactionArticle(a)).length,
    draftCount: articles.filter((a) => a.status === 'draft').length,
    scheduledCount: articles.filter((a) => a.status === 'scheduled').length,
    totalViews: articles.reduce((sum, a) => sum + (a.viewCount ?? 0), 0),
    breakingCount: articles.filter((a) => a.isBreaking && isLiveRedactionArticle(a)).length,
  };
}

export async function getEditorStats(user: RedactionUser): Promise<RedactionStats> {
  const authorFilter = await buildListAuthorFilter(user);

  const [publishedCount, scheduledCount, draftCount, engagement] = await Promise.all([
    getStrapiArticleTotal(authorFilter, 'published'),
    getStrapiArticleTotal(authorFilter, 'draft', { status: { $eq: 'scheduled' } }),
    getStrapiArticleTotal(authorFilter, 'draft', { status: { $eq: 'draft' } }),
    fetchPublishedEngagementTotals(authorFilter),
  ]);

  return {
    totalArticles: publishedCount + draftCount + scheduledCount,
    publishedCount,
    draftCount,
    scheduledCount,
    totalViews: engagement.totalViews,
    breakingCount: engagement.breakingCount,
  };
}

/** Publie ou dépublie un article (super admin — tous les rédacteurs). */
export async function setEditorArticlePublication(
  user: RedactionUser,
  documentId: string,
  publish: boolean
): Promise<RedactionArticle> {
  if (!isRedactionSuperAdmin(user)) {
    throw new RedactionAuthError('Accès réservé aux super administrateurs');
  }

  const existing = await getEditorArticle(user, documentId);
  if (!existing) throw new RedactionAuthError('Article introuvable');

  if (publish) {
    if (isLiveRedactionArticle(existing)) return existing;
    if (!existing.category?.documentId) {
      throw new RedactionAuthError('Rubrique requise pour publier');
    }
    const title = existing.title?.trim();
    const excerpt = existing.excerpt?.trim();
    const plainContent = existing.content?.replace(/<[^>]+>/g, '').trim();
    if (!title || !excerpt || !plainContent) {
      throw new RedactionAuthError('Titre, chapô et contenu requis pour publier');
    }

    return updateEditorArticle(user, documentId, {
      title: existing.title,
      excerpt: existing.excerpt,
      content: existing.content,
      categoryDocumentIds: [
        existing.category.documentId,
        ...(existing.secondaryCategories?.map((c) => c.documentId) ?? []),
      ],
      tagNames: existing.tagNames,
      publish: true,
      draftOnly: false,
    });
  }

  if (!isLiveRedactionArticle(existing)) return existing;

  await strapiFetch(`/articles/${documentId}/actions/unpublish`, undefined, { method: 'POST' });

  const refreshed = await getEditorArticle(user, documentId);
  if (!refreshed) throw new RedactionAuthError('Article introuvable après dépublication');
  return refreshed;
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
): Promise<{ id: number; url: string; name?: string; alternativeText?: string }> {
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

  const text = await res.text();
  if (!res.ok) {
    let detail = text.replace(/\s+/g, ' ').trim().slice(0, 200);
    try {
      const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
      detail = json.error?.message ?? json.message ?? detail;
    } catch {
      // corps HTML ou texte brut
    }
    throw new Error(detail ? `Upload Strapi échoué : ${detail}` : `Upload échoué (${res.status})`);
  }

  let data: { id: number; url: string }[];
  try {
    data = JSON.parse(text) as { id: number; url: string }[];
  } catch {
    throw new Error('Réponse Strapi invalide après upload');
  }
  const media = data[0];
  if (!media?.id) throw new Error('Upload sans identifiant');

  return {
    id: media.id,
    url: media.url,
    name: (media as { name?: string }).name,
    alternativeText: (media as { alternativeText?: string }).alternativeText,
  };
}

function mapUploadFile(raw: Record<string, unknown>): RedactionMediaItem {
  const formats = raw.formats as
    | {
        thumbnail?: { url?: string };
        small?: { url?: string };
        medium?: { url?: string };
      }
    | undefined;
  const url = raw.url as string;
  const previewUrl =
    formats?.thumbnail?.url ?? formats?.small?.url ?? formats?.medium?.url ?? url;

  return {
    id: raw.id as number,
    url,
    previewUrl,
    name: (raw.name as string) ?? '',
    alternativeText: raw.alternativeText as string | null | undefined,
    caption: raw.caption as string | null | undefined,
    width: raw.width as number | undefined,
    height: raw.height as number | undefined,
    mime: (raw.mime as string) ?? '',
    createdAt: raw.createdAt as string | undefined,
  };
}

export async function listEditorMedia(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ items: RedactionMediaItem[]; total: number; pageCount: number }> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 24;
  const search = options?.search?.trim();

  const filters: Record<string, unknown> = search
    ? {
        $and: [
          { mime: { $startsWith: 'image' } },
          {
            $or: [
              { name: { $containsi: search } },
              { alternativeText: { $containsi: search } },
              { caption: { $containsi: search } },
            ],
          },
        ],
      }
    : { mime: { $startsWith: 'image' } };

  const query = qs.stringify(
    {
      filters,
      sort: ['createdAt:desc'],
      pagination: { page, pageSize },
    },
    { encodeValuesOnly: true }
  );

  const res = await fetch(`${getStrapiUrl()}/api/upload/files?${query}`, {
    headers: apiTokenHeaders(),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Médiathèque indisponible (${res.status}): ${text.slice(0, 120)}`);
  }

  const data = (await res.json()) as
    | Record<string, unknown>[]
    | { results?: Record<string, unknown>[]; pagination?: { total: number; pageCount: number } };

  if (Array.isArray(data)) {
    return {
      items: data.map((item) => mapUploadFile(item)),
      total: data.length,
      pageCount: 1,
    };
  }

  const items = (data.results ?? []).map((item) => mapUploadFile(item));
  return {
    items,
    total: data.pagination?.total ?? items.length,
    pageCount: data.pagination?.pageCount ?? 1,
  };
}

export async function updateEditorMedia(
  id: number,
  payload: { alternativeText?: string; caption?: string }
): Promise<RedactionMediaItem> {
  if (!STRAPI_TOKEN) {
    throw new Error('STRAPI_API_TOKEN manquant');
  }

  const form = new FormData();
  form.append('fileInfo', JSON.stringify(payload));

  const res = await fetch(`${getStrapiUrl()}/api/upload?id=${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: form,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Mise à jour média échouée (${res.status})`);
  }

  const data = (await res.json()) as Record<string, unknown>[] | Record<string, unknown>;
  const file = Array.isArray(data) ? data[0] : data;
  if (!file?.id) throw new Error('Réponse média invalide');
  return mapUploadFile(file);
}

async function loginUsersPermissionsUser(
  identifier: string,
  password: string
): Promise<{ jwt: string; user: RedactionUser } | null> {
  const res = await fetch(`${getStrapiUrl()}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier.trim(), password }),
    cache: 'no-store',
  });

  const data = (await res.json()) as {
    jwt?: string;
    user?: { id: number; email: string; username: string };
  };

  if (!res.ok || !data.jwt || !data.user?.email) return null;

  const strapiRoleName = await fetchUsersPermissionsRoleName(data.user.id, data.jwt);

  return {
    jwt: data.jwt,
    user: mapUsersPermissionsToRedactionUser(data.user, strapiRoleName),
  };
}

async function loginAdminUser(
  email: string,
  password: string
): Promise<{ jwt: string; user: RedactionUser }> {
  const res = await fetch(`${getStrapiUrl()}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toLowerCase(), password }),
    cache: 'no-store',
  });

  const data = (await res.json()) as {
    data?: { token?: string };
    error?: { message?: string };
  };

  if (!res.ok || !data.data?.token) {
    throw new RedactionAuthError('Identifiants incorrects');
  }

  const user = await verifyAdminUser(data.data.token);
  if (!user) {
    throw new RedactionAuthError('Identifiants incorrects');
  }

  return { jwt: data.data.token, user };
}

export async function loginRedactionUser(
  identifier: string,
  password: string
): Promise<{ jwt: string; user: RedactionUser }> {
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    throw new RedactionAuthError('Identifiants requis');
  }

  const fromUsers = await loginUsersPermissionsUser(trimmed, password);
  if (fromUsers) return fromUsers;

  const email = trimmed.toLowerCase();
  if (EMAIL_PATTERN.test(email)) {
    return loginAdminUser(email, password);
  }

  throw new RedactionAuthError('Identifiants incorrects');
}

function mapComment(entity: StrapiEntity): RedactionComment {
  const article = entity.article as StrapiEntity | null | undefined;
  const category = article?.category as StrapiEntity | null | undefined;

  return {
    documentId: entity.documentId,
    content: entity.content as string,
    authorName: entity.authorName as string,
    authorEmail: entity.authorEmail as string,
    status: entity.status as RedactionComment['status'],
    createdAt: entity.createdAt as string,
    article: article
      ? {
          documentId: article.documentId,
          title: article.title as string,
          slug: article.slug as string,
          category: category ? { slug: category.slug as string } : undefined,
        }
      : undefined,
  };
}

export async function listEditorComments(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
): Promise<RedactionComment[]> {
  const filters: Record<string, unknown> = {};
  if (status !== 'all') {
    filters.status = { $eq: status };
  }

  const response = await strapiFetch<{ data: StrapiEntity[] }>('/comments', {
    filters,
    populate: { article: { populate: { category: true } } },
    sort: ['createdAt:desc'],
    pagination: { pageSize: 100 },
  });

  return response.data.map(mapComment);
}

export async function countPendingComments(): Promise<number> {
  const response = await strapiFetch<{ meta: { pagination: { total: number } } }>('/comments', {
    filters: { status: { $eq: 'pending' } },
    pagination: { pageSize: 1 },
  });
  return response.meta.pagination.total;
}

export async function moderateEditorComment(
  documentId: string,
  status: 'approved' | 'rejected'
): Promise<RedactionComment> {
  const response = await strapiFetch<{ data: StrapiEntity }>(`/comments/${documentId}`, undefined, {
    method: 'PUT',
    body: JSON.stringify({ data: { status } }),
  });
  return mapComment(response.data);
}

export async function createPublicComment(payload: {
  content: string;
  authorName: string;
  authorEmail: string;
  articleDocumentId: string;
}): Promise<RedactionComment> {
  const response = await strapiFetch<{ data: StrapiEntity }>('/comments', undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        content: payload.content.trim().slice(0, 2000),
        authorName: payload.authorName.trim().slice(0, 100),
        authorEmail: payload.authorEmail.trim().toLowerCase(),
        status: 'pending',
        article: payload.articleDocumentId,
      },
    }),
  });
  return mapComment(response.data);
}

export type { FcmSubscriptionPayload };
