import { getArticlePath } from '@/config/site';
import { isArticlePublished, isRecentPublication } from '@/lib/article-publish';
import { pushConfig } from '@/lib/push/config';
import { sendPushToReaders } from '@/lib/push/send';
import { strapiAdminFetch } from '@/lib/push/strapi-admin';
import { isFirebaseAdminConfigured } from '@/lib/firebase/config';

export interface PublishArticlePushResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  message?: string;
  sent?: number;
  failed?: number;
  markFailed?: boolean;
}

interface PushArticle {
  documentId: string;
  title: string;
  seoTitle?: string;
  slug: string;
  excerpt: string;
  status: string;
  publishedAt?: string;
  wpPublishedAt?: string | null;
  pushSentAt?: string | null;
  category?: { slug?: string };
}

const PUSH_DEDUP_WINDOW_MS = 2 * 60 * 1000;
const pushInFlight = new Map<string, Promise<PublishArticlePushResult>>();
const recentPushes = new Map<string, number>();

function cleanupRecentPushes(now = Date.now()): void {
  for (const [slug, at] of recentPushes.entries()) {
    if (now - at > PUSH_DEDUP_WINDOW_MS) {
      recentPushes.delete(slug);
    }
  }
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

async function fetchArticleForPush(slug: string): Promise<(PushArticle & { articleUrl: string }) | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const article = await getArticleForPush(slug);
    if (article) return article;
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  return null;
}

async function markPushSent(documentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 3;
  let lastError = 'markPushSent failed';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await strapiAdminFetch(`/articles/${documentId}?status=published`, undefined, {
        method: 'PUT',
        body: JSON.stringify({
          data: { pushSentAt: new Date().toISOString() },
        }),
      });
      return { ok: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'markPushSent failed';
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
  }

  return { ok: false, error: lastError };
}

function pushErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'unknown_error';
}

export async function publishArticlePush(slug: string): Promise<PublishArticlePushResult> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return { ok: false, skipped: true, reason: 'article_not_found' };
  }

  cleanupRecentPushes();
  const recentAt = recentPushes.get(normalizedSlug);
  if (recentAt && Date.now() - recentAt < PUSH_DEDUP_WINDOW_MS) {
    return { ok: true, skipped: true, reason: 'recent_duplicate' };
  }

  const running = pushInFlight.get(normalizedSlug);
  if (running) {
    return running;
  }

  const task = (async (): Promise<PublishArticlePushResult> => {
    try {
      if (!pushConfig.enabled || !pushConfig.sendOnPublish) {
        return { ok: true, skipped: true, reason: 'push_disabled' };
      }

      const article = await fetchArticleForPush(normalizedSlug);
      if (!article) {
        return { ok: false, skipped: true, reason: 'article_not_found' };
      }

      if (!isArticlePublished(article)) {
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

      if (!isFirebaseAdminConfigured()) {
        return { ok: false, skipped: true, reason: 'firebase_not_configured' };
      }

      const { sent, failed } = await sendPushToReaders({
        title: article.seoTitle?.trim() || article.title,
        body,
        url: article.articleUrl,
      });

      if (sent > 0) {
        recentPushes.set(normalizedSlug, Date.now());
      }

      if (sent > 0) {
        const marked = await markPushSent(article.documentId);
        if (!marked.ok) {
          console.error('[push] markPushSent failed after send:', {
            slug: normalizedSlug,
            documentId: article.documentId,
            sent,
            failed,
            error: marked.error,
          });
          return {
            ok: false,
            reason: 'mark_failed',
            markFailed: true,
            sent,
            failed,
          };
        }
      }

      return { ok: failed === 0, sent, failed };
    } catch (error) {
      const message = pushErrorMessage(error);
      console.error('[push/publishArticlePush]', normalizedSlug, message);
      return { ok: false, reason: 'error', message };
    } finally {
      pushInFlight.delete(normalizedSlug);
    }
  })();

  pushInFlight.set(normalizedSlug, task);
  return task;
}
