import qs from 'qs';
import { unstable_cache } from 'next/cache';
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStrapiUrl } from '@/lib/redaction/config';
import type { AdminAnalytics, AdminAnalyticsPoint, AdminStatsRange } from '@/lib/redaction/types';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
const ANALYTICS_REVALIDATE_SEC = 120;

interface StrapiListResponse<T> {
  data: T[];
  meta: { pagination: { page: number; pageCount: number; total: number } };
}

interface StrapiArticleRow {
  documentId: string;
  title: string;
  viewCount?: number;
  publishedAt?: string;
  category?: { name?: string };
}

interface StrapiCommentRow {
  status: string;
  createdAt: string;
}

interface StrapiSubscriberRow {
  status: string;
  source?: string;
  subscribedAt?: string;
  createdAt?: string;
}

function apiHeaders(): HeadersInit {
  if (!STRAPI_TOKEN) throw new Error('STRAPI_API_TOKEN manquant');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_TOKEN}`,
  };
}

async function strapiList<T>(path: string, params: Record<string, unknown>): Promise<T[]> {
  const pageSize = 100;
  let page = 1;
  const items: T[] = [];

  while (true) {
    const query = qs.stringify(
      { ...params, pagination: { page, pageSize } },
      { encodeValuesOnly: true }
    );
    const res = await fetch(`${getStrapiUrl()}/api${path}?${query}`, {
      headers: apiHeaders(),
      next: { revalidate: ANALYTICS_REVALIDATE_SEC },
    });
    if (!res.ok) break;

    const body = (await res.json()) as StrapiListResponse<T>;
    items.push(...body.data);
    if (page >= body.meta.pagination.pageCount) break;
    page += 1;
  }

  return items;
}

async function strapiCount(
  path: string,
  filters?: Record<string, unknown>,
  options?: { publicationStatus?: 'draft' | 'published' }
): Promise<number> {
  const query = qs.stringify(
    {
      filters,
      pagination: { pageSize: 1 },
      ...(options?.publicationStatus ? { status: options.publicationStatus } : {}),
    },
    { encodeValuesOnly: true }
  );
  const res = await fetch(`${getStrapiUrl()}/api${path}?${query}`, {
    headers: apiHeaders(),
    next: { revalidate: ANALYTICS_REVALIDATE_SEC },
  });
  if (!res.ok) return 0;
  const body = (await res.json()) as StrapiListResponse<unknown>;
  return body.meta.pagination.total;
}

function buildDateKeys(days: AdminStatsRange): string[] {
  const keys: string[] = [];
  const end = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(format(subDays(end, i), 'yyyy-MM-dd'));
  }
  return keys;
}

function countByDate(
  items: { date?: string }[],
  days: AdminStatsRange,
  from: Date,
  to: Date
): AdminAnalyticsPoint[] {
  const keys = buildDateKeys(days);
  const counts = new Map(keys.map((k) => [k, 0]));

  for (const item of items) {
    if (!item.date) continue;
    const parsed = parseISO(item.date);
    if (Number.isNaN(parsed.getTime())) continue;
    if (!isWithinInterval(parsed, { start: from, end: to })) continue;
    const key = format(parsed, 'yyyy-MM-dd');
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return keys.map((date) => ({ date, value: counts.get(date) ?? 0 }));
}

function topNamedValues(
  entries: Map<string, number>,
  limit = 10
): { name: string; value: number }[] {
  return [...entries.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

function scopedArticleFilters(authorDocumentId?: string): Record<string, unknown> {
  if (!authorDocumentId) return {};
  return { author: { documentId: { $eq: authorDocumentId } } };
}

async function countUniqueAuthorArticles(authorDocumentId: string): Promise<number> {
  const filters = scopedArticleFilters(authorDocumentId);
  const [publishedRows, draftRows] = await Promise.all([
    strapiList<{ documentId: string }>('/articles', {
      filters,
      status: 'published',
      fields: ['documentId'],
    }),
    strapiList<{ documentId: string }>('/articles', {
      filters,
      status: 'draft',
      fields: ['documentId'],
    }),
  ]);

  return new Set([...publishedRows, ...draftRows].map((row) => row.documentId)).size;
}

function countPublishedInRange(
  articles: StrapiArticleRow[],
  from: Date,
  to: Date
): number {
  return articles.filter((article) => {
    if (!article.publishedAt) return false;
    const published = parseISO(article.publishedAt);
    return !Number.isNaN(published.getTime()) && isWithinInterval(published, { start: from, end: to });
  }).length;
}
function commentFiltersForScope(
  authorDocumentId: string | undefined,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const filters: Record<string, unknown> = { ...extra };
  if (authorDocumentId) {
    filters.article = { author: { documentId: { $eq: authorDocumentId } } };
  }
  return filters;
}

const GEO_ESTIMATE: { name: string; share: number }[] = [
  { name: 'République démocratique du Congo', share: 0.68 },
  { name: 'France', share: 0.09 },
  { name: 'Belgique', share: 0.06 },
  { name: 'États-Unis', share: 0.04 },
  { name: 'Canada', share: 0.03 },
  { name: 'Afrique du Sud', share: 0.02 },
  { name: 'Autres', share: 0.08 },
];

async function buildRedactionAnalytics(
  days: AdminStatsRange,
  options?: { authorDocumentId?: string }
): Promise<AdminAnalytics> {
  const authorDocumentId = options?.authorDocumentId;
  const isAuthorScope = Boolean(authorDocumentId);
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, days - 1));

  const articleFilters = scopedArticleFilters(authorDocumentId);

  const commentRangeFilter = commentFiltersForScope(authorDocumentId, {
    createdAt: { $gte: from.toISOString(), $lte: to.toISOString() },
  });

  const [
    articleMetrics,
    commentsInRange,
    pendingComments,
    approvedComments,
    rejectedComments,
    subscribers,
    pushSubscribers,
    totalArticles,
    activeSubscribers,
    unsubscribedSubscribers,
  ] = await Promise.all([
    strapiList<StrapiArticleRow>('/articles', {
      filters: articleFilters,
      status: 'published',
      fields: ['title', 'viewCount', 'publishedAt', 'documentId'],
      populate: { category: { fields: ['name'] } },
      sort: ['viewCount:desc'],
    }),
    strapiList<StrapiCommentRow>('/comments', {
      filters: commentRangeFilter,
      fields: ['status', 'createdAt'],
      sort: ['createdAt:desc'],
    }),
    strapiCount('/comments', commentFiltersForScope(authorDocumentId, { status: { $eq: 'pending' } })),
    strapiCount('/comments', commentFiltersForScope(authorDocumentId, { status: { $eq: 'approved' } })),
    strapiCount('/comments', commentFiltersForScope(authorDocumentId, { status: { $eq: 'rejected' } })),
    isAuthorScope
      ? Promise.resolve([] as StrapiSubscriberRow[])
      : strapiList<StrapiSubscriberRow>('/subscribers', {
          fields: ['status', 'source', 'subscribedAt', 'createdAt'],
          filters: {
            $or: [
              { subscribedAt: { $gte: from.toISOString() } },
              { createdAt: { $gte: from.toISOString() } },
            ],
          },
          sort: ['subscribedAt:desc'],
        }),
    isAuthorScope ? Promise.resolve(0) : strapiCount('/reader-push-subscriptions'),
    authorDocumentId
      ? countUniqueAuthorArticles(authorDocumentId)
      : strapiCount('/articles', undefined, { publicationStatus: 'published' }),
    isAuthorScope ? Promise.resolve(0) : strapiCount('/subscribers', { status: { $eq: 'active' } }),
    isAuthorScope ? Promise.resolve(0) : strapiCount('/subscribers', { status: { $eq: 'unsubscribed' } }),
  ]);

  const totalViews = articleMetrics.reduce((sum, article) => sum + (article.viewCount ?? 0), 0);
  const publishedTotal = articleMetrics.length;
  const publishedInRange = countPublishedInRange(articleMetrics, from, to);

  const commentDates = commentsInRange.map((c) => ({ date: c.createdAt }));
  const publicationsTimeline = countByDate(
    articleMetrics
      .filter((a) => a.publishedAt)
      .map((a) => ({ date: a.publishedAt })),
    days,
    from,
    to
  );
  const commentsTimeline = countByDate(commentDates, days, from, to);

  const subscriberDates = subscribers
    .filter((s) => s.status === 'active')
    .map((s) => ({ date: s.subscribedAt ?? s.createdAt }));

  const sourceMap = new Map<string, number>();
  for (const sub of subscribers.filter((s) => s.status === 'active')) {
    const key = (sub.source?.trim() || 'web').toLowerCase();
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }

  const categoryViews = new Map<string, number>();
  for (const article of articleMetrics) {
    const name = article.category?.name ?? 'Sans rubrique';
    categoryViews.set(name, (categoryViews.get(name) ?? 0) + (article.viewCount ?? 0));
  }

  const categoryTotal = [...categoryViews.values()].reduce((s, v) => s + v, 0) || 1;
  const referrers = topNamedValues(categoryViews, 8).map((item) => ({
    name: item.name,
    value: Math.round((item.value / categoryTotal) * 100),
  }));

  const countries = isAuthorScope
    ? []
    : GEO_ESTIMATE.map((item) => ({
        name: item.name,
        value: Math.round(totalViews * item.share),
      }));

  return {
    range: {
      days,
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    },
    summary: {
      views: totalViews,
      visitors: 0,
      articles: totalArticles,
      published: publishedInRange,
      publishedTotal,
      comments: commentsInRange.length,
      subscribers: activeSubscribers,
      pushSubscribers,
      pendingComments,
    },
    traffic: publicationsTimeline,
    trends: {
      views: publicationsTimeline,
      articles: publicationsTimeline,
      comments: commentsTimeline,
    },
    subscribers: {
      active: activeSubscribers,
      unsubscribed: unsubscribedSubscribers,
      growth: countByDate(subscriberDates, days, from, to),
      sources: topNamedValues(sourceMap, 6),
    },
    referrers,
    countries,
    topArticles: articleMetrics.slice(0, 15).map((a) => ({
      documentId: a.documentId,
      title: a.title,
      views: a.viewCount ?? 0,
      category: a.category?.name,
      publishedAt: a.publishedAt,
    })),
    topCategories: topNamedValues(categoryViews, 8),
    comments: {
      pending: pendingComments,
      approved: approvedComments,
      rejected: rejectedComments,
      timeline: commentsTimeline,
    },
    dataSources: {
      viewsEstimated: false,
      geoEstimated: !isAuthorScope,
    },
  };
}

function cacheKey(days: AdminStatsRange, authorDocumentId?: string): string {
  return authorDocumentId
    ? `redaction-analytics-author-${authorDocumentId}-${days}`
    : `redaction-analytics-site-${days}`;
}

function getCachedAnalytics(days: AdminStatsRange, authorDocumentId?: string) {
  return unstable_cache(
    () => buildRedactionAnalytics(days, authorDocumentId ? { authorDocumentId } : undefined),
    [cacheKey(days, authorDocumentId)],
    { revalidate: ANALYTICS_REVALIDATE_SEC, tags: ['redaction-analytics'] }
  )();
}

export async function getAdminAnalytics(days: AdminStatsRange): Promise<AdminAnalytics> {
  return getCachedAnalytics(days);
}

export async function getAuthorAnalytics(
  authorDocumentId: string,
  days: AdminStatsRange
): Promise<AdminAnalytics> {
  return getCachedAnalytics(days, authorDocumentId);
}

export function formatStatsDate(dateKey: string): string {
  return format(parseISO(dateKey), 'd MMM', { locale: fr });
}
