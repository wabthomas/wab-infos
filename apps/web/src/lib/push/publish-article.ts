import { getArticlePath } from '@/config/site';
import { pushConfig } from '@/lib/push/config';
import { sendPushToReaders } from '@/lib/push/send';
import { listReaderPushSubscriptions } from '@/lib/push/subscriptions';
import { strapiAdminFetch } from '@/lib/push/strapi-admin';
import { ensureWebPushConfigured } from '@/lib/push/vapid';

export interface PublishArticlePushResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  sent?: number;
  failed?: number;
}

interface PushArticle {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  publishedAt?: string;
  wpPublishedAt?: string | null;
  pushSentAt?: string | null;
  category?: { slug?: string };
}

function isRecentPublication(publishedAt?: string, wpPublishedAt?: string | null): boolean {
  const effectiveDate = wpPublishedAt || publishedAt;
  if (!effectiveDate) return true;
  const maxAgeMs = 48 * 60 * 60 * 1000;
  return Date.now() - new Date(effectiveDate).getTime() <= maxAgeMs;
}

async function getArticleForPush(slug: string): Promise<(PushArticle & { articleUrl: string }) | null> {
  const result = await strapiAdminFetch<{ data: PushArticle[] }>('/articles', {
    filters: { slug: { $eq: slug } },
    populate: { category: true },
    status: 'published',
  });

  const article = result.data[0];
  if (!article) return null;

  const categorySlug = article.category?.slug ?? 'actualite';
  const articleUrl = `${pushConfig.siteUrl}${getArticlePath(
    { slug: article.slug, category: article.category },
    categorySlug
  )}`;

  return { ...article, articleUrl };
}

async function markPushSent(documentId: string): Promise<void> {
  await strapiAdminFetch(`/articles/${documentId}?status=published`, undefined, {
    method: 'PUT',
    body: JSON.stringify({
      data: { pushSentAt: new Date().toISOString() },
    }),
  });
}

export async function publishArticlePush(slug: string): Promise<PublishArticlePushResult> {
  if (!pushConfig.enabled || !pushConfig.sendOnPublish) {
    return { ok: true, skipped: true, reason: 'push_disabled' };
  }

  const article = await getArticleForPush(slug);
  if (!article) {
    return { ok: false, skipped: true, reason: 'article_not_found' };
  }

  if (article.status !== 'published') {
    return { ok: true, skipped: true, reason: 'not_published' };
  }

  if (article.pushSentAt) {
    return { ok: true, skipped: true, reason: 'already_sent' };
  }

  if (!isRecentPublication(article.publishedAt, article.wpPublishedAt)) {
    return { ok: true, skipped: true, reason: 'article_too_old' };
  }

  const body =
    article.excerpt?.replace(/<[^>]+>/g, '').trim().slice(0, 140) ||
    'Nouvel article sur Wab-infos';

  const subscriptions = await listReaderPushSubscriptions();
  if (!subscriptions.length) {
    return { ok: true, skipped: true, reason: 'no_subscribers' };
  }

  if (!ensureWebPushConfigured()) {
    return { ok: false, skipped: true, reason: 'vapid_not_configured' };
  }

  // Marquer avant l'envoi pour éviter les doublons si Strapi échoue après envoi
  await markPushSent(article.documentId);

  const { sent, failed } = await sendPushToReaders({
    title: article.title,
    body,
    url: article.articleUrl,
  });

  return { ok: failed === 0, sent, failed };
}
