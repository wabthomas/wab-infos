import qs from 'qs';
import { format, subDays, parseISO, differenceInCalendarDays, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStrapiUrl } from '@/lib/redaction/config';
import type { AdminAnalytics, AdminAnalyticsPoint, AdminStatsRange } from '@/lib/redaction/types';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

interface StrapiListResponse<T> {
  data: T[];
  meta: { pagination: { page: number; pageCount: number; total: number } };
}

interface StrapiArticleRow {
  documentId: string;
  title: string;
  viewCount?: number;
  publishedAt?: string;
  status?: string;
  category?: { name?: string };
}

interface StrapiCommentRow {
  status: string;
  createdAt: string;
  article?: { author?: { documentId?: string } };
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

async function strapiList<T>(
  path: string,
  params: Record<string, unknown>
): Promise<T[]> {
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
      cache: 'no-store',
    });
    if (!res.ok) break;

    const body = (await res.json()) as StrapiListResponse<T>;
    items.push(...body.data);
    if (page >= body.meta.pagination.pageCount) break;
    page += 1;
  }

  return items;
}

async function strapiCount(path: string, filters?: Record<string, unknown>): Promise<number> {
  const query = qs.stringify(
    { filters, pagination: { pageSize: 1 } },
    { encodeValuesOnly: true }
  );
  const res = await fetch(`${getStrapiUrl()}/api${path}?${query}`, {
    headers: apiHeaders(),
    cache: 'no-store',
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

function estimateTrafficSeries(
  articles: StrapiArticleRow[],
  days: AdminStatsRange,
  from: Date,
  to: Date
): AdminAnalyticsPoint[] {
  const keys = buildDateKeys(days);
  const views = new Map(keys.map((k) => [k, 0]));
  const now = new Date();

  for (const article of articles) {
    const viewsTotal = article.viewCount ?? 0;
    if (viewsTotal <= 0 || article.status !== 'published' || !article.publishedAt) continue;

    const published = parseISO(article.publishedAt);
    if (Number.isNaN(published.getTime()) || published > now) continue;

    const articleAge = Math.max(1, differenceInCalendarDays(now, published));
    const dailyShare = viewsTotal / articleAge;

    for (const key of keys) {
      const day = parseISO(key);
      if (day < published || day < from || day > to) continue;
      views.set(key, (views.get(key) ?? 0) + dailyShare);
    }
  }

  return keys.map((date) => ({
    date,
    value: Math.round(views.get(date) ?? 0),
  }));
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

const GEO_ESTIMATE: { name: string; share: number }[] = [
  { name: 'République démocratique du Congo', share: 0.68 },
  { name: 'France', share: 0.09 },
  { name: 'Belgique', share: 0.06 },
  { name: 'États-Unis', share: 0.04 },
  { name: 'Canada', share: 0.03 },
  { name: 'Afrique du Sud', share: 0.02 },
  { name: 'Autres', share: 0.08 },
];

export async function getAdminAnalytics(days: AdminStatsRange): Promise<AdminAnalytics> {
  return getRedactionAnalytics(days);
}

export async function getAuthorAnalytics(
  authorDocumentId: string,
  days: AdminStatsRange
): Promise<AdminAnalytics> {
  return getRedactionAnalytics(days, { authorDocumentId });
}

export async function getRedactionAnalytics(
  days: AdminStatsRange,
  options?: { authorDocumentId?: string }
): Promise<AdminAnalytics> {
  const authorDocumentId = options?.authorDocumentId;
  const isAuthorScope = Boolean(authorDocumentId);
  const to = new Date();
  const from = subDays(to, days - 1);

  const articleFilters: Record<string, unknown> = { status: { $eq: 'published' } };
  if (authorDocumentId) {
    articleFilters.author = { documentId: { $eq: authorDocumentId } };
  }

  const [articles, commentsRaw, subscribers, pushSubscribers, pendingComments, totalArticles] =
    await Promise.all([
      strapiList<StrapiArticleRow>('/articles', {
        filters: articleFilters,
        status: 'published',
        populate: { category: true, author: true },
        fields: ['title', 'viewCount', 'publishedAt', 'status'],
        sort: ['viewCount:desc'],
      }),
      strapiList<StrapiCommentRow>('/comments', {
        fields: ['status', 'createdAt'],
        populate: { article: { populate: { author: true } } },
        sort: ['createdAt:desc'],
      }),
      isAuthorScope
        ? Promise.resolve([] as StrapiSubscriberRow[])
        : strapiList<StrapiSubscriberRow>('/subscribers', {
            fields: ['status', 'source', 'subscribedAt', 'createdAt'],
            sort: ['subscribedAt:desc'],
          }),
      isAuthorScope ? Promise.resolve(0) : strapiCount('/reader-push-subscriptions'),
      isAuthorScope
        ? Promise.resolve(0)
        : strapiCount('/comments', { status: { $eq: 'pending' } }),
      authorDocumentId
        ? strapiCount('/articles', { author: { documentId: { $eq: authorDocumentId } } })
        : strapiCount('/articles'),
    ]);

  const comments = authorDocumentId
    ? commentsRaw.filter((c) => c.article?.author?.documentId === authorDocumentId)
    : commentsRaw;

  const pendingForScope = authorDocumentId
    ? comments.filter((c) => c.status === 'pending').length
    : pendingComments;


  const traffic = estimateTrafficSeries(articles, days, from, to);
  const rangeViews = traffic.reduce((sum, p) => sum + p.value, 0);
  const visitors = Math.round(rangeViews * 0.72);

  const commentDates = comments.map((c) => ({ date: c.createdAt }));
  const subscriberDates = subscribers
    .filter((s) => s.status === 'active')
    .map((s) => ({ date: s.subscribedAt ?? s.createdAt }));

  const sourceMap = new Map<string, number>();
  for (const sub of subscribers.filter((s) => s.status === 'active')) {
    const key = (sub.source?.trim() || 'web').toLowerCase();
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }

  const categoryViews = new Map<string, number>();
  for (const article of articles) {
    const name = article.category?.name ?? 'Sans rubrique';
    categoryViews.set(name, (categoryViews.get(name) ?? 0) + (article.viewCount ?? 0));
  }

  const referrerTotal = [...categoryViews.values()].reduce((s, v) => s + v, 0) || 1;
  const referrers = topNamedValues(categoryViews, 8).map((item) => ({
    name: item.name,
    value: Math.round((item.value / referrerTotal) * 100),
  }));

  const countries = isAuthorScope
    ? []
    : GEO_ESTIMATE.map((item) => ({
        name: item.name,
        value: Math.round(visitors * item.share),
      }));

  const commentsByStatus = {
    pending: comments.filter((c) => c.status === 'pending').length,
    approved: comments.filter((c) => c.status === 'approved').length,
    rejected: comments.filter((c) => c.status === 'rejected').length,
  };

  const publishedInRange = articles.filter((a) => {
    if (!a.publishedAt) return false;
    const d = parseISO(a.publishedAt);
    return !Number.isNaN(d.getTime()) && isWithinInterval(d, { start: from, end: to });
  });

  return {
    range: {
      days,
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    },
    summary: {
      views: rangeViews,
      visitors,
      articles: totalArticles,
      published: articles.length,
      comments: comments.length,
      subscribers: subscribers.filter((s) => s.status === 'active').length,
      pushSubscribers,
      pendingComments: pendingForScope,
    },
    traffic: traffic.map((p) => ({ date: p.date, value: p.value })),
    trends: {
      views: traffic,
      articles: countByDate(
        publishedInRange.map((a) => ({ date: a.publishedAt })),
        days,
        from,
        to
      ),
      comments: countByDate(commentDates, days, from, to),
    },
    subscribers: {
      active: subscribers.filter((s) => s.status === 'active').length,
      unsubscribed: subscribers.filter((s) => s.status === 'unsubscribed').length,
      growth: countByDate(subscriberDates, days, from, to),
      sources: topNamedValues(sourceMap, 6),
    },
    referrers,
    countries,
    topArticles: [...articles]
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 15)
      .map((a) => ({
        documentId: a.documentId,
        title: a.title,
        views: a.viewCount ?? 0,
        category: a.category?.name,
        publishedAt: a.publishedAt,
      })),
    topCategories: topNamedValues(categoryViews, 8),
    comments: {
      ...commentsByStatus,
      timeline: countByDate(commentDates, days, from, to),
    },
    dataSources: {
      viewsEstimated: true,
      geoEstimated: !isAuthorScope,
    },
  };
}

export function formatStatsDate(dateKey: string): string {
  return format(parseISO(dateKey), 'd MMM', { locale: fr });
}
