import qs from 'qs';
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

function firstImageFromHtml(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
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

function mapArticle(entity: StrapiEntity): Article {
  let featuredImage = mapMedia(entity.featuredImage as StrapiEntity);
  const content = entity.content as string;

  if (!featuredImage?.url && content) {
    const fallbackUrl = firstImageFromHtml(content);
    if (fallbackUrl) {
      featuredImage = { id: 0, url: fallbackUrl };
    }
  }

  const rawViews = entity.viewCount ?? entity.view_count;
  const viewCount = typeof rawViews === 'number' && Number.isFinite(rawViews) ? rawViews : 0;

  return {
    id: entity.id,
    documentId: entity.documentId,
    title: entity.title as string,
    slug: entity.slug as string,
    excerpt: entity.excerpt as string,
    content,
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
    readingTime: (entity.readingTime as number) ?? 3,
    seoTitle: entity.seoTitle as string | undefined,
    seoDescription: entity.seoDescription as string | undefined,
    canonicalUrl: entity.canonicalUrl as string | undefined,
    wpId: entity.wpId as number | undefined,
  };
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

const ARTICLE_SORT = ['wpPublishedAt:desc', 'publishedAt:desc'] as const;
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

export async function getArticles(options?: {
  page?: number;
  pageSize?: number;
  category?: string;
  featured?: boolean;
  breaking?: boolean;
  recommended?: boolean;
}): Promise<{ articles: Article[]; pagination: { total: number; pageCount: number } }> {
  const filters: Record<string, unknown> = {};

  if (options?.category) filters.category = { slug: { $eq: options.category } };
  if (options?.featured) filters.isFeatured = { $eq: true };
  if (options?.breaking) filters.isBreaking = { $eq: true };
  if (options?.recommended) filters.isRecommended = { $eq: true };

  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters,
    ...articlePopulate,
    sort: [...ARTICLE_SORT],
    pagination: { page: options?.page ?? 1, pageSize: options?.pageSize ?? 12 },
    status: 'published',
  });

  return {
    articles: response.data.map(mapArticle),
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
    ...articlePopulate,
    sort: [...ARTICLE_SORT],
    pagination: { page: 1, pageSize },
    status: 'published',
  });

  for (const entity of response.data) {
    const article = mapArticle(entity);
    const slug = article.category?.slug;
    if (!slug || !(slug in byCategory)) continue;
    if (byCategory[slug].length < limitPerCategory) {
      byCategory[slug].push(article);
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

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const response = await fetchAPI<StrapiListResponse<StrapiEntity>>('/articles', {
    filters: { slug: { $eq: slug } },
    ...articlePopulate,
    status: 'published',
  });

  if (!response.data.length) return null;
  return mapArticle(response.data[0]);
}

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
    ...articlePopulate,
    sort: [...TOP_READ_SORT],
    pagination: { page: 1, pageSize: limit },
    status: 'published',
  });

  return response.data.map(mapArticle);
}

export async function getFeaturedArticles(): Promise<Article[]> {
  const { articles } = await getArticles({ featured: true, pageSize: 6 });
  return articles;
}

export async function getRecommendedArticles(excludeSlug?: string): Promise<Article[]> {
  const { articles } = await getArticles({ recommended: true, pageSize: 4 });
  return excludeSlug ? articles.filter((a) => a.slug !== excludeSlug) : articles;
}

/** Articles liés : même rubrique, puis récents — ne dépend pas de isRecommended */
export async function getRelatedArticles(
  slug: string,
  categorySlug?: string,
  pageSize = 4
): Promise<Article[]> {
  const seen = new Set<string>([slug]);
  const result: Article[] = [];

  if (categorySlug) {
    const sameCategory = await getArticles({ category: categorySlug, pageSize: pageSize + 5 });
    for (const article of sameCategory.articles) {
      if (result.length >= pageSize) break;
      if (seen.has(article.slug)) continue;
      seen.add(article.slug);
      result.push(article);
    }
  }

  if (result.length < pageSize) {
    const recent = await getArticles({ pageSize: pageSize + 10 });
    for (const article of recent.articles) {
      if (result.length >= pageSize) break;
      if (seen.has(article.slug)) continue;
      seen.add(article.slug);
      result.push(article);
    }
  }

  return result;
}

export async function searchArticles(query: string, page = 1): Promise<{
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
    ...articlePopulate,
    sort: [...ARTICLE_SORT],
    pagination: { page, pageSize: 12 },
    status: 'published',
  });

  return {
    articles: response.data.map(mapArticle),
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
      const category = entity.category as StrapiEntity | undefined;
      paths.push({
        slug: entity.slug as string,
        categorySlug: (category?.slug as string) ?? 'actualite',
        updatedAt: (entity.updatedAt as string) ?? (entity.publishedAt as string),
      });
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
      $or: [
        { wpPublishedAt: { $gte: since } },
        { publishedAt: { $gte: since }, wpPublishedAt: { $null: true } },
      ],
    },
    fields: ['title', 'slug', 'publishedAt', 'wpPublishedAt', 'updatedAt', 'seoTitle'],
    populate: { category: true, tags: true },
    sort: [...ARTICLE_SORT],
    pagination: { pageSize: 1000 },
    status: 'published',
  });

  return response.data.map(mapArticle);
}
