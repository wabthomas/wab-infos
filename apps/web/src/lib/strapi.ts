import qs from 'qs';
import { cache } from 'react';
import type {
  Article,
  Author,
  Category,
  Tag,
  Video,
  Show,
  StrapiListResponse,
  StrapiResponse,
  StrapiMedia,
} from '@wab-infos/shared';
import { canonicalizeCategorySlug } from '@/config/site';

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

interface StrapiEntity {
  id: number;
  documentId: string;
  [key: string]: unknown;
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (STRAPI_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
  }
  return headers;
}

const STRAPI_FETCH_TIMEOUT_MS = Number(process.env.STRAPI_FETCH_TIMEOUT_MS || 15_000);

async function fetchAPI<T>(path: string, params?: Record<string, unknown>, options?: RequestInit): Promise<T> {
  const query = params ? `?${qs.stringify(params, { encodeValuesOnly: true })}` : '';
  const url = `${STRAPI_URL}/api${path}${query}`;

  const controller = new AbortController();
  let timedOut = false;
  let externallyAborted = false;

  const timeoutId = setTimeout(() => {
    if (!externallyAborted) {
      timedOut = true;
    }
    controller.abort();
  }, STRAPI_FETCH_TIMEOUT_MS);

  if (options?.signal) {
    if (options.signal.aborted) {
      externallyAborted = true;
      controller.abort();
    } else {
      options.signal.addEventListener(
        'abort',
        () => {
          externallyAborted = true;
          controller.abort();
        },
        { once: true }
      );
    }
  }

  const isMutation =
    options?.method != null && String(options.method).toUpperCase() !== 'GET';

  try {
    const res = await fetch(url, {
      headers: getHeaders(),
      ...(isMutation ? { cache: 'no-store' as RequestCache } : { next: { revalidate: 60 } }),
      ...options,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Strapi API error: ${res.status} ${res.statusText} — ${path}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (controller.signal.aborted) {
      if (timedOut) {
        throw new Error(`Strapi API timeout after ${STRAPI_FETCH_TIMEOUT_MS}ms — ${path}`);
      }
      if (externallyAborted) {
        throw new Error(`Strapi API request aborted — ${path}`);
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapMedia(media: StrapiEntity | null | undefined): StrapiMedia | undefined {
  if (!media) return undefined;

  const record = media as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    return mapMedia(record.data as StrapiEntity);
  }

  const url = media.url as string | undefined;
  if (!url) return undefined;

  const formats = media.formats as StrapiMedia['formats'];

  return {
    id: media.id,
    url,
    alternativeText: media.alternativeText as string | undefined,
    caption: media.caption as string | undefined,
    width: media.width as number | undefined,
    height: media.height as number | undefined,
    formats,
  };
}

function normalizeCoverCandidateUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url || url.startsWith('data:')) return null;

  url = url
    .replace(/^https?:\/\/(?:www\.)?wab-infos\.com\/wp-content\/uploads\//i, '/wp-content/uploads/')
    .replace(/^https?:\/\/(?:www\.)?wabsoft\.com\/wp-content\/uploads\//i, '/wp-content/uploads/')
    .replace(/^https?:\/\/(?:www\.)?wab-infos\.com\/uploads\//i, '/uploads/')
    .replace(/^https?:\/\/cms\.app\.wab-infos\.com\/uploads\//i, '/uploads/');

  if (url.startsWith('uploads/') || url.startsWith('wp-content/')) {
    url = `/${url}`;
  }

  // Miniatures listes : uniquement médias same-origin (évite next/image + hotlinks cassés).
  if (url.startsWith('/uploads/') || url.startsWith('/wp-content/')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'wab-infos.com' || host.endsWith('.wab-infos.com')) {
      if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/wp-content/')) {
        return `${parsed.pathname}${parsed.search}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function firstImageFromHtml(html: string): string | undefined {
  if (!html) return undefined;

  const patterns = [
    /<img[^>]+src=["']([^"']+)["']/i,
    /<img[^>]+data-src=["']([^"']+)["']/i,
    /<img[^>]+data-lazy-src=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const normalized = match?.[1] ? normalizeCoverCandidateUrl(match[1]) : null;
    if (normalized) return normalized;
  }

  return undefined;
}

function mapAuthor(entity: StrapiEntity): Author {
  return {
    id: entity.id,
    documentId: entity.documentId,
    name: entity.name as string,
    slug: entity.slug as string,
    bio: entity.bio as string | undefined,
    avatar: mapMedia(entity.avatar as StrapiEntity),
    role: entity.role as string | undefined,
    twitter: entity.twitter as string | undefined,
    email: entity.email as string | undefined,
  };
}

function mapCategory(entity: StrapiEntity): Category {
  return {
    id: entity.id,
    documentId: entity.documentId,
    name: entity.name as string,
    slug: entity.slug as string,
    description: entity.description as string | undefined,
    color: entity.color as string | undefined,
  };
}

function mapTag(entity: StrapiEntity): Tag {
  return {
    id: entity.id,
    documentId: entity.documentId,
    name: entity.name as string,
    slug: entity.slug as string,
  };
}

function mapArticle(entity: StrapiEntity, options?: { keepContent?: boolean }): Article {
  let featuredImage = mapMedia(entity.featuredImage as StrapiEntity);
  const content = typeof entity.content === 'string' ? entity.content : '';

  if (!featuredImage?.url && content) {
    const fallbackUrl = firstImageFromHtml(content);
    if (fallbackUrl) {
      featuredImage = { id: 0, url: fallbackUrl };
    }
  }

  const rawViews = entity.viewCount ?? entity.view_count;
  const viewCount = typeof rawViews === 'number' && Number.isFinite(rawViews) ? rawViews : 0;
  const rawLikes = entity.likeCount ?? entity.like_count;
  const likeCount = typeof rawLikes === 'number' && Number.isFinite(rawLikes) ? rawLikes : 0;

  return {
    id: entity.id,
    documentId: entity.documentId,
    title: entity.title as string,
    slug: entity.slug as string,
    excerpt: entity.excerpt as string,
    content: options?.keepContent === false ? '' : content,
    status: entity.status as Article['status'],
    publishedAt: entity.publishedAt as string,
    updatedAt: entity.updatedAt as string,
    createdAt: entity.createdAt as string,
    wpPublishedAt: entity.wpPublishedAt as string | undefined,
    featuredImage,
    author: entity.author ? mapAuthor(entity.author as StrapiEntity) : undefined,
    category: entity.category ? mapCategory(entity.category as StrapiEntity) : undefined,
    tags: Array.isArray(entity.tags)
      ? (entity.tags as StrapiEntity[]).map(mapTag)
      : undefined,
    isFeatured: (entity.isFeatured as boolean) ?? false,
    isBreaking: (entity.isBreaking as boolean) ?? false,
    isRecommended: (entity.isRecommended as boolean) ?? false,
    viewCount,
    likeCount,
    readingTime: (entity.readingTime as number) ?? 3,
    seoTitle: entity.seoTitle as string | undefined,
    seoDescription: entity.seoDescription as string | undefined,
    canonicalUrl: entity.canonicalUrl as string | undefined,
    wpId: entity.wpId as number | undefined,
  };
}

/** Pour les listes légères : récupère le HTML seulement pour les articles sans cover. */
async function enrichMissingFeaturedImages(articles: Article[]): Promise<Article[]> {
  const missing = articles.filter((article) => !article.featuredImage?.url && article.documentId);
  if (!missing.length) return articles;

  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters: {
      documentId: { $in: missing.map((article) => article.documentId) },
    },
    fields: ['documentId', 'content'],
    pagination: { page: 1, pageSize: Math.min(100, missing.length) },
    status: 'published',
  });

  const coverByDocumentId = new Map<string, string>();
  for (const entity of response.data) {
    const documentId = entity.documentId as string | undefined;
    const content = typeof entity.content === 'string' ? entity.content : '';
    const cover = firstImageFromHtml(content);
    if (documentId && cover) coverByDocumentId.set(documentId, cover);
  }

  if (!coverByDocumentId.size) return articles;

  return articles.map((article) => {
    if (article.featuredImage?.url) return article;
    const cover = coverByDocumentId.get(article.documentId);
    if (!cover) return article;
    return {
      ...article,
      featuredImage: { id: 0, url: cover },
    };
  });
}

function mapVideo(entity: StrapiEntity): Video {
  return {
    id: entity.id,
    documentId: entity.documentId,
    title: entity.title as string,
    slug: entity.slug as string,
    description: entity.description as string | undefined,
    youtubeId: entity.youtubeId as string,
    type: entity.type as Video['type'],
    thumbnail: mapMedia(entity.thumbnail as StrapiEntity),
    publishedAt: entity.publishedAt as string,
    duration: entity.duration as string | undefined,
    show: entity.show ? {
      id: (entity.show as StrapiEntity).id,
      documentId: (entity.show as StrapiEntity).documentId,
      name: (entity.show as StrapiEntity).name as string,
      slug: (entity.show as StrapiEntity).slug as string,
      description: (entity.show as StrapiEntity).description as string | undefined,
      thumbnail: mapMedia((entity.show as StrapiEntity).thumbnail as StrapiEntity),
    } : undefined,
  };
}

/** Tri public : publishedAt d’abord (toujours renseigné si live).
 * wpPublishedAt en second — les NULL wpPublishedAt passent après en DESC MySQL
 * et enterraient les nouveaux articles hors de la 1ʳᵉ page. */
const ARTICLE_SORT = ['publishedAt:desc', 'wpPublishedAt:desc'] as const;
const TOP_READ_SORT = ['viewCount:desc', ...ARTICLE_SORT] as const;
const VIDEO_SORT = ['publishedAt:desc'] as const;

const articlePopulate = {
  populate: {
    featuredImage: true,
    author: { populate: { avatar: true } },
    category: true,
    tags: true,
  },
};

/** Listes / home : pas de content HTML ni tags/avatar — réponse Strapi nettement plus légère. */
const listArticleQuery = {
  fields: [
    'title',
    'slug',
    'excerpt',
    'status',
    'publishedAt',
    'updatedAt',
    'createdAt',
    'wpPublishedAt',
    'isFeatured',
    'isBreaking',
    'isRecommended',
    'viewCount',
    'likeCount',
    'readingTime',
  ],
  populate: {
    featuredImage: true,
    author: { fields: ['name', 'slug'] },
    category: true,
  },
};

export async function getArticles(options?: {
  page?: number;
  pageSize?: number;
  category?: string;
  tag?: string;
  author?: string;
  featured?: boolean;
  breaking?: boolean;
  recommended?: boolean;
  /** Inclut content + tags + avatar (défaut listes légères). */
  full?: boolean;
}): Promise<{ articles: Article[]; pagination: { total: number; pageCount: number } }> {
  const filters: Record<string, unknown> = {};

  if (options?.category) filters.category = { slug: { $eq: options.category } };
  if (options?.tag) filters.tags = { slug: { $eq: options.tag } };
  if (options?.author) filters.author = { slug: { $eq: options.author } };
  if (options?.featured) filters.isFeatured = { $eq: true };
  if (options?.breaking) filters.isBreaking = { $eq: true };
  if (options?.recommended) filters.isRecommended = { $eq: true };

  const keepContent = Boolean(options?.full || options?.tag);
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters,
    ...(keepContent ? articlePopulate : listArticleQuery),
    sort: [...ARTICLE_SORT],
    pagination: { page: options?.page ?? 1, pageSize: options?.pageSize ?? 12 },
    status: 'published',
  });

  let articles = response.data.map((entity) =>
    mapArticle(entity, { keepContent })
  );

  if (!keepContent) {
    articles = await enrichMissingFeaturedImages(articles);
  }

  return {
    articles,
    pagination: {
      total: response.meta?.pagination?.total ?? 0,
      pageCount: response.meta?.pagination?.pageCount ?? 0,
    },
  };
}

/** Derniers articles par rubrique — une requête Strapi (+ rattrapage si besoin). */
export async function getArticlesByCategories(
  slugs: readonly string[],
  limitPerCategory = 6
): Promise<Record<string, Article[]>> {
  const uniqueSlugs = [...new Set(slugs)];
  if (!uniqueSlugs.length) return {};

  const byCategory: Record<string, Article[]> = Object.fromEntries(
    uniqueSlugs.map((slug) => [slug, [] as Article[]])
  );

  const pageSize = Math.min(100, uniqueSlugs.length * limitPerCategory * 4);

  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters: {
      category: { slug: { $in: uniqueSlugs } },
    },
    ...listArticleQuery,
    sort: [...ARTICLE_SORT],
    pagination: { page: 1, pageSize },
    status: 'published',
  });

  for (const entity of response.data) {
    const article = mapArticle(entity, { keepContent: false });
    const slug = article.category?.slug;
    if (!slug || !(slug in byCategory)) continue;
    if (byCategory[slug].length < limitPerCategory) {
      byCategory[slug].push(article);
    }
  }

  // Fallback covers pour les listes home (sans content dans la requête principale).
  const flat = Object.values(byCategory).flat();
  const enriched = await enrichMissingFeaturedImages(flat);
  if (enriched !== flat) {
    const byId = new Map(enriched.map((article) => [article.documentId, article]));
    for (const slug of uniqueSlugs) {
      byCategory[slug] = byCategory[slug].map((article) => byId.get(article.documentId) ?? article);
    }
  }

  const missingSlugs = uniqueSlugs.filter((slug) => byCategory[slug].length < limitPerCategory);
  if (missingSlugs.length > 0) {
    const fallbacks = await Promise.all(
      missingSlugs.map(async (slug) => {
        const { articles } = await getArticles({ category: slug, pageSize: limitPerCategory });
        return [slug, articles] as const;
      })
    );
    for (const [slug, articles] of fallbacks) {
      if (byCategory[slug].length < limitPerCategory) {
        const seen = new Set(byCategory[slug].map((a) => a.id));
        for (const article of articles) {
          if (byCategory[slug].length >= limitPerCategory) break;
          if (seen.has(article.id)) continue;
          byCategory[slug].push(article);
        }
      }
    }
  }

  return byCategory;
}

export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters: { slug: { $eq: slug } },
    ...articlePopulate,
    status: 'published',
  });

  if (!response.data.length) return null;
  return mapArticle(response.data[0]);
});

export async function getBreakingNews(): Promise<Article[]> {
  const { articles } = await getArticles({ breaking: true, pageSize: 5 });
  return articles;
}

/** Articles les plus lus — tri côté Strapi par nombre de vues. */
export async function getTopReadArticles(
  limit = 5,
  options?: { category?: string }
): Promise<Article[]> {
  const filters: Record<string, unknown> = {};
  if (options?.category) filters.category = { slug: { $eq: options.category } };

  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters,
    ...listArticleQuery,
    sort: [...TOP_READ_SORT],
    pagination: { page: 1, pageSize: limit },
    status: 'published',
  });

  return enrichMissingFeaturedImages(
    response.data.map((entity) => mapArticle(entity, { keepContent: false }))
  );
}

export async function getFeaturedArticles(): Promise<Article[]> {
  const { articles } = await getArticles({ featured: true, pageSize: 6 });
  return articles;
}

export async function getRecommendedArticles(excludeSlug?: string): Promise<Article[]> {
  const { articles } = await getArticles({ recommended: true, pageSize: 4 });
  return excludeSlug ? articles.filter((a) => a.slug !== excludeSlug) : articles;
}

function scoreSharedTags(article: Article, tagSlugs: ReadonlySet<string>): number {
  if (!tagSlugs.size || !article.tags?.length) return 0;
  return article.tags.reduce((score, tag) => score + (tagSlugs.has(tag.slug) ? 1 : 0), 0);
}

const RELATED_TITLE_STOPWORDS = new Set([
  'avec', 'dans', 'pour', 'plus', 'dont', 'cette', 'chez', 'sous', 'vers', 'après',
  'apres', 'avant', 'entre', 'selon', 'alors', 'aussi', 'donc', 'mais', 'comme',
  'leur', 'leurs', 'elle', 'elles', 'nous', 'vous', 'sont', 'être', 'etre', 'fait',
  'faites', 'sans', 'tout', 'tous', 'toute', 'toutes', 'autre', 'autres', 'encore',
  'contre', 'depuis', 'parce', 'quoi', 'quand', 'comment', 'rdc', 'congo', 'kinshasa',
]);

/** Mots significatifs du titre pour retrouver d’anciens articles sur le même sujet. */
function significantTitleTerms(title: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const token of normalized.split(/[^a-z0-9]+/)) {
    if (token.length < 5 || RELATED_TITLE_STOPWORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
    if (terms.length >= 4) break;
  }
  return terms;
}

/**
 * Articles liés : d’abord même sujet (tags partagés, y compris articles plus anciens),
 * puis mots-clés du titre, puis même rubrique, puis récents du site.
 */
export const getRelatedArticles = cache(async (
  slug: string,
  categorySlug?: string,
  pageSize = 4,
  tagSlugs: readonly string[] = [],
  title = ''
): Promise<Article[]> => {
  const seen = new Set<string>([slug]);
  const result: Article[] = [];
  const tagSet = new Set(tagSlugs.filter(Boolean));

  const pushUnique = (articles: Article[]) => {
    for (const article of articles) {
      if (result.length >= pageSize) break;
      if (seen.has(article.slug)) continue;
      seen.add(article.slug);
      result.push(article);
    }
  };

  if (tagSet.size > 0) {
    const taggedResponse = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
      filters: {
        tags: { slug: { $in: [...tagSet] } },
        slug: { $ne: slug },
      },
      ...articlePopulate,
      sort: [...ARTICLE_SORT],
      pagination: { page: 1, pageSize: Math.max(pageSize * 4, 16) },
      status: 'published',
    });

    const ranked = taggedResponse.data
      .map((entity) => mapArticle(entity))
      .map((article) => ({ article, score: scoreSharedTags(article, tagSet) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    pushUnique(ranked.map((row) => row.article));
  }

  if (result.length < pageSize) {
    const titleTerms = significantTitleTerms(title);
    if (titleTerms.length > 0) {
      const titleResponse = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
        filters: {
          slug: { $ne: slug },
          $or: titleTerms.map((term) => ({ title: { $containsi: term } })),
        },
        ...listArticleQuery,
        sort: [...ARTICLE_SORT],
        pagination: { page: 1, pageSize: Math.max(pageSize * 3, 12) },
        status: 'published',
      });
      pushUnique(titleResponse.data.map((entity) => mapArticle(entity)));
    }
  }

  if (result.length < pageSize) {
    const [categoryResult, recentResult] = await Promise.all([
      categorySlug
        ? getArticles({ category: categorySlug, pageSize: pageSize + 8 })
        : Promise.resolve({ articles: [] as Article[], pagination: { total: 0, pageCount: 0 } }),
      getArticles({ pageSize: pageSize + 10 }),
    ]);

    pushUnique(categoryResult.articles);
    if (result.length < pageSize) {
      pushUnique(recentResult.articles);
    }
  }

  return result;
});

export async function searchArticles(
  query: string,
  page = 1,
  pageSize = 12
): Promise<{
  articles: Article[];
  pagination: { total: number; pageCount: number };
}> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters: {
      $or: [
        { title: { $containsi: query } },
        { excerpt: { $containsi: query } },
        { content: { $containsi: query } },
      ],
    },
    ...listArticleQuery,
    sort: [...ARTICLE_SORT],
    pagination: { page, pageSize },
    status: 'published',
  });

  return {
    articles: await enrichMissingFeaturedImages(
      response.data.map((entity) => mapArticle(entity, { keepContent: false }))
    ),
    pagination: {
      total: response.meta?.pagination?.total ?? 0,
      pageCount: response.meta?.pagination?.pageCount ?? 0,
    },
  };
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/categories', {
    sort: ['name:asc'],
    pagination: { pageSize: 50 },
  });
  return response.data.map(mapCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/categories', {
    filters: { slug: { $eq: slug } },
  });
  if (!response.data.length) return null;
  return mapCategory(response.data[0]);
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/authors', {
    filters: { slug: { $eq: slug } },
    populate: { avatar: true },
  });
  if (!response.data.length) return null;
  return mapAuthor(response.data[0]);
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/tags', {
    filters: { slug: { $eq: slug } },
  });
  if (!response.data.length) return null;
  return mapTag(response.data[0]);
}

export async function getAllTagSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/tags', {
      fields: ['slug'],
      pagination: { page, pageSize: 100 },
    });

    for (const entity of response.data) {
      if (typeof entity.slug === 'string') slugs.push(entity.slug);
    }

    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page++;
  }

  return [...new Set(slugs)];
}

/** Tags avec assez d’articles pour mériter d’être crawlés (évite le thin content). */
export async function getTagSlugsWithMinArticles(minArticles = 3): Promise<string[]> {
  const all = await getAllTagSlugs();
  const rich: string[] = [];

  // Lots pour ne pas saturuer Strapi
  const batchSize = 8;
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize);
    const counts = await Promise.all(
      batch.map(async (slug) => {
        try {
          const result = await getArticles({ tag: slug, pageSize: 1 });
          return { slug, total: result.pagination.total ?? result.articles.length };
        } catch {
          return { slug, total: 0 };
        }
      })
    );
    for (const row of counts) {
      if (row.total >= minArticles) rich.push(row.slug);
    }
  }

  return rich;
}

export async function getAllAuthorSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/authors', {
      fields: ['slug'],
      pagination: { page, pageSize: 100 },
    });

    for (const entity of response.data) {
      if (typeof entity.slug === 'string') slugs.push(entity.slug);
    }

    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page++;
  }

  return [...new Set(slugs)];
}

export async function getVideos(options?: { type?: Video['type']; pageSize?: number }): Promise<Video[]> {
  const filters: Record<string, unknown> = {};
  if (options?.type) filters.type = { $eq: options.type };

  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/videos', {
    filters,
    populate: { thumbnail: true, show: { populate: { thumbnail: true } } },
    sort: [...VIDEO_SORT],
    pagination: { pageSize: options?.pageSize ?? 12 },
    status: 'published',
  });

  return response.data.map(mapVideo);
}

export async function getShows(): Promise<Show[]> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/shows', {
    populate: { thumbnail: true },
    sort: ['name:asc'],
  });

  return response.data.map((entity) => ({
    id: entity.id,
    documentId: entity.documentId,
    name: entity.name as string,
    slug: entity.slug as string,
    description: entity.description as string | undefined,
    thumbnail: mapMedia(entity.thumbnail as StrapiEntity),
  }));
}

export async function incrementArticleViews(
  documentId: string
): Promise<{ viewCount: number }> {
  const response = await fetchAPI<{ data: { viewCount: number } }>(
    `/articles/${documentId}/views`,
    undefined,
    { method: 'POST', cache: 'no-store' }
  );
  return response.data;
}

export async function toggleArticleLike(
  documentId: string,
  liked: boolean
): Promise<{ likeCount: number; liked: boolean }> {
  const response = await fetchAPI<{ data: { likeCount: number; liked: boolean } }>(
    `/articles/${documentId}/likes`,
    undefined,
    {
      method: 'POST',
      cache: 'no-store',
      body: JSON.stringify({ liked }),
    }
  );
  return response.data;
}

export interface ArticleComment {
  documentId: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export async function getApprovedComments(articleDocumentId: string): Promise<ArticleComment[]> {
  try {
    const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/comments', {
      filters: {
        status: { $eq: 'approved' },
        article: { documentId: { $eq: articleDocumentId } },
      },
      sort: ['createdAt:asc'],
      pagination: { pageSize: 50 },
    });

    return response.data.map((entity) => ({
      documentId: entity.documentId,
      content: entity.content as string,
      authorName: entity.authorName as string,
      createdAt: entity.createdAt as string,
    }));
  } catch {
    return [];
  }
}

function mapArticlePathEntity(entity: StrapiEntity): {
  slug: string;
  categorySlug: string;
  updatedAt: string;
} {
  const category = entity.category as StrapiEntity | undefined;
  const rawCategory = (category?.slug as string) ?? 'actualite';
  return {
    slug: entity.slug as string,
    categorySlug: canonicalizeCategorySlug(rawCategory),
    updatedAt: (entity.updatedAt as string) ?? (entity.publishedAt as string),
  };
}

export async function getPublishedArticleCount(): Promise<number> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    fields: ['slug'],
    pagination: { page: 1, pageSize: 1 },
    status: 'published',
  });
  return response.meta?.pagination?.total ?? 0;
}

/** Chunk paginé pour les sitemaps articles (évite de charger ~20k URLs d’un coup). */
export async function getArticlePathsChunk(
  chunkIndex: number,
  chunkSize: number
): Promise<{ slug: string; categorySlug: string; updatedAt: string }[]> {
  const pageSize = 100;
  const startOffset = chunkIndex * chunkSize;
  const startPage = Math.floor(startOffset / pageSize) + 1;
  const endPage = Math.floor((startOffset + chunkSize - 1) / pageSize) + 1;
  const paths: { slug: string; categorySlug: string; updatedAt: string }[] = [];

  for (let page = startPage; page <= endPage; page++) {
    const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
      fields: ['slug', 'updatedAt', 'publishedAt'],
      populate: { category: { fields: ['slug'] } },
      sort: ['updatedAt:desc'],
      pagination: { page, pageSize },
      status: 'published',
    });

    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    for (const entity of response.data) {
      paths.push(mapArticlePathEntity(entity));
    }

    if (page >= pageCount) break;
  }

  const sliceStart = startOffset % pageSize;
  return paths.slice(sliceStart, sliceStart + chunkSize);
}

export async function getAllArticlePaths(): Promise<
  { slug: string; categorySlug: string; updatedAt: string }[]
> {
  const paths: { slug: string; categorySlug: string; updatedAt: string }[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
      fields: ['slug', 'updatedAt', 'publishedAt'],
      populate: { category: { fields: ['slug'] } },
      pagination: { page, pageSize: 100 },
      status: 'published',
    });

    for (const entity of response.data) {
      paths.push(mapArticlePathEntity(entity));
    }

    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page++;
  }

  return paths;
}

export async function getVideoByYoutubeId(youtubeId: string): Promise<Video | null> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/videos', {
    filters: { youtubeId: { $eq: youtubeId } },
    populate: { thumbnail: true, show: { populate: { thumbnail: true } } },
    pagination: { pageSize: 1 },
    status: 'published',
  });

  if (!response.data.length) return null;
  return mapVideo(response.data[0]);
}

export async function getAllVideosForSitemap(): Promise<Video[]> {
  const videos: Video[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/videos', {
      pagination: { page, pageSize: 100 },
      status: 'published',
    });

    videos.push(...response.data.map(mapVideo));
    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page++;
  }

  return videos;
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
      fields: ['slug'],
      pagination: { page, pageSize: 100 },
      status: 'published',
    });
    slugs.push(...response.data.map((a) => a.slug as string));
    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page++;
  }

  return slugs;
}

export async function getRecentArticlesForNewsSitemap(hours = 48): Promise<Article[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters: {
      $or: [{ wpPublishedAt: { $gte: since } }, { publishedAt: { $gte: since } }],
    },
    fields: ['title', 'slug', 'publishedAt', 'wpPublishedAt', 'updatedAt', 'seoTitle'],
    populate: { category: true, tags: true },
    sort: [...ARTICLE_SORT],
    pagination: { pageSize: 1000 },
    status: 'published',
  });

  return response.data.map((entity) => mapArticle(entity, { keepContent: false }));
}
