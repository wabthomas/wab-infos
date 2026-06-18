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

async function fetchAPI<T>(path: string, params?: Record<string, unknown>, options?: RequestInit): Promise<T> {
  const query = params ? `?${qs.stringify(params, { encodeValuesOnly: true })}` : '';
  const url = `${STRAPI_URL}/api${path}${query}`;

  const res = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 60 },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`Strapi API error: ${res.status} ${res.statusText} — ${path}`);
  }

  return res.json() as Promise<T>;
}

function mapMedia(media: StrapiEntity | null | undefined): StrapiMedia | undefined {
  if (!media) return undefined;
  return {
    id: media.id,
    url: media.url as string,
    alternativeText: media.alternativeText as string | undefined,
    width: media.width as number | undefined,
    height: media.height as number | undefined,
    formats: media.formats as StrapiMedia['formats'],
  };
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
  return {
    id: entity.id,
    documentId: entity.documentId,
    title: entity.title as string,
    slug: entity.slug as string,
    excerpt: entity.excerpt as string,
    content: entity.content as string,
    status: entity.status as Article['status'],
    publishedAt: entity.publishedAt as string,
    updatedAt: entity.updatedAt as string,
    createdAt: entity.createdAt as string,
    featuredImage: mapMedia(entity.featuredImage as StrapiEntity),
    author: entity.author ? mapAuthor(entity.author as StrapiEntity) : undefined,
    category: entity.category ? mapCategory(entity.category as StrapiEntity) : undefined,
    tags: Array.isArray(entity.tags)
      ? (entity.tags as StrapiEntity[]).map(mapTag)
      : undefined,
    isFeatured: (entity.isFeatured as boolean) ?? false,
    isBreaking: (entity.isBreaking as boolean) ?? false,
    isRecommended: (entity.isRecommended as boolean) ?? false,
    viewCount: (entity.viewCount as number) ?? 0,
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
    sort: ['publishedAt:desc'],
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
    sort: ['publishedAt:desc'],
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
    sort: ['publishedAt:desc'],
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

export async function incrementArticleViews(documentId: string): Promise<void> {
  await fetchAPI(`/articles/${documentId}/views`, {}, { method: 'POST' });
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
    filters: { publishedAt: { $gte: since } },
    fields: ['title', 'slug', 'publishedAt', 'updatedAt'],
    populate: { category: true },
    sort: ['publishedAt:desc'],
    pagination: { pageSize: 1000 },
    status: 'published',
  });

  return response.data.map(mapArticle);
}
