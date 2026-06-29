import { cache } from 'react';
import { cookies } from 'next/headers';
import qs from 'qs';
import { getStrapiUrl, REDACTION_COOKIE } from '@/lib/redaction/config';
import type {
  ArticleEditorPayload,
  FcmSubscriptionPayload,
  RedactionArticle,
  RedactionAuthor,
  RedactionCategory,
  RedactionComment,
  RedactionMediaItem,
  RedactionStats,
  RedactionUser,
} from '@/lib/redaction/types';
import { calculateReadingTime, generateSeoDescription, generateSeoTitle, slugify } from '@/lib/utils';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (publishedAt) {
    if (raw === 'scheduled' && scheduledAt && new Date(scheduledAt).getTime() > Date.now()) {
      return 'scheduled';
    }
    return 'published';
  }

  if (raw === 'scheduled' && scheduledAt && new Date(scheduledAt).getTime() > Date.now()) {
    return 'scheduled';
  }

  return raw;
}

export function isLiveRedactionArticle(article: RedactionArticle): boolean {
  // Seul publishedAt garantit une publication Strapi (draft & publish).
  // Le champ custom status peut valoir "published" sur un brouillon non publié.
  return Boolean(article.publishedAt);
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
}> {
  const author = await resolveAuthorForUser(user);
  return {
    user,
    author,
    isSuperAdmin: isRedactionSuperAdmin(user),
    canAssignAuthor: canAssignArticleAuthor(user),
    canDeleteAnyArticle: canDeleteAnyArticle(user),
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

export async function listEditorArticles(
  user: RedactionUser,
  status?: 'draft' | 'published' | 'scheduled' | 'all',
  options?: { omitContent?: boolean }
): Promise<RedactionArticle[]> {
  const author = await resolveAuthorForUser(user);

  const authorFilter = { author: { documentId: { $eq: author.documentId } } };
  const populate = options?.omitContent
    ? { category: true, featuredImage: true }
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
    pagination: { pageSize: 100 },
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

  const fetchPublished = (extraFilters?: Record<string, unknown>) =>
    strapiFetch<{ data: StrapiEntity[] }>('/articles', {
      ...listParams,
      filters: { ...authorFilter, ...extraFilters },
      status: 'published',
    });

  const fetchDrafts = (extraFilters?: Record<string, unknown>) =>
    strapiFetch<{ data: StrapiEntity[] }>('/articles', {
      ...listParams,
      filters: { ...authorFilter, ...extraFilters },
      status: 'draft',
    });

  const sortByUpdated = (articles: RedactionArticle[]) =>
    articles.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  if (status === 'published') {
    const response = await fetchPublished();
    return sortByUpdated(response.data.map(mapArticle).filter(isLiveRedactionArticle));
  }

  if (status === 'scheduled') {
    const drafts = await fetchDrafts({ status: { $eq: 'scheduled' } });
    return sortByUpdated(
      drafts.data.map(mapArticle).filter((article) => article.status === 'scheduled')
    );
  }

  if (status === 'draft') {
    const [published, drafts] = await Promise.all([
      fetchPublished(),
      fetchDrafts({ status: { $eq: 'draft' } }),
    ]);
    const publishedIds = new Set(published.data.map((item) => item.documentId));
    return sortByUpdated(
      drafts.data
        .filter((item) => !publishedIds.has(item.documentId))
        .map(mapArticle)
        .filter((article) => article.status === 'draft' && !isLiveRedactionArticle(article))
    );
  }

  const [published, drafts] = await Promise.all([fetchPublished(), fetchDrafts()]);
  const publishedIds = new Set(published.data.map((item) => item.documentId));
  const merged = new Map<string, RedactionArticle>();

  for (const item of drafts.data) {
    if (!publishedIds.has(item.documentId)) {
      merged.set(item.documentId, mapArticle(item));
    }
  }
  for (const item of published.data) {
    merged.set(item.documentId, mapArticle(item));
  }

  return sortByUpdated([...merged.values()]);
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
  const slug = generateArticleSlug(payload.title);
  const saveMode = payload.draftOnly
    ? { strapiStatus: 'draft' as const, customStatus: 'draft' as const, scheduledAt: null }
    : resolveArticleSaveMode(payload) ?? {
        strapiStatus: 'draft' as const,
        customStatus: 'draft' as const,
        scheduledAt: null,
      };
  const author = await resolveAuthorForArticleSave(user, payload, saveMode);
  const tagIds =
    saveMode.strapiStatus === 'published'
      ? await syncArticleTags({
          title: payload.title,
          excerpt: payload.excerpt,
          tagNames: payload.tagNames,
        })
      : undefined;
  const endpoint =
    saveMode.strapiStatus === 'published' ? '/articles?status=published' : '/articles';

  const response = await strapiFetch<{ data: StrapiEntity }>(endpoint, undefined, {
    method: 'POST',
    body: JSON.stringify({
      data: buildArticleData(payload, author, slug, saveMode, tagIds),
    }),
  });

  return mapArticle(response.data);
}

export async function updateEditorArticle(
  user: RedactionUser,
  documentId: string,
  payload: Partial<ArticleEditorPayload>
): Promise<RedactionArticle> {
  const existing = await getEditorArticle(user, documentId);
  if (!existing) throw new RedactionAuthError('Article introuvable');

  const isDraftOnly = Boolean(payload.draftOnly);
  const saveMode = isDraftOnly ? null : resolveArticleSaveMode(payload);
  const author = await resolveAuthorForArticleSave(user, payload, saveMode);
  // Autosave / brouillon : toujours la version draft (?status=published publierait l'article).
  const statusParam: 'draft' | 'published' = isDraftOnly
    ? 'draft'
    : (saveMode?.strapiStatus ??
      (isLiveRedactionArticle(existing) ? 'published' : 'draft'));

  const title = payload.title?.trim() || existing.title;
  const excerpt = payload.excerpt?.trim() || existing.excerpt;
  const slug = resolveArticleSlug(existing, title);

  const publishing = saveMode?.strapiStatus === 'published';
  const tagIds = publishing
    ? await syncArticleTags({
        title,
        excerpt,
        tagNames: payload.tagNames ?? existing.tagNames,
      })
    : undefined;

  const response = await strapiFetch<{ data: StrapiEntity }>(
    `/articles/${documentId}?status=${statusParam}`,
    undefined,
    {
      method: 'PUT',
      body: JSON.stringify({
        data: buildArticleData(payload, author, slug, saveMode, tagIds),
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
  const articles = await listEditorArticles(user, 'all');
  return computeEditorStats(articles);
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

  if (!res.ok) {
    throw new Error(`Upload échoué (${res.status})`);
  }

  const data = (await res.json()) as { id: number; url: string }[];
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
