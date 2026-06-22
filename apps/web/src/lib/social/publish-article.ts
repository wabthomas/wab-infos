import {
  getArticleForSocial,
  markFacebookPosted,
  markXPosted,
} from '@/lib/social/article-data';
import { buildFacebookMessage, buildXMessage } from '@/lib/social/build-post';
import { isFacebookConfigured, isXConfigured, socialConfig } from '@/lib/social/config';
import { postToFacebook } from '@/lib/social/facebook';
import { postToX } from '@/lib/social/x';

export interface PublishArticleSocialResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  facebook?: { ok: boolean; postId?: string; error?: string; skipped?: boolean };
  x?: { ok: boolean; tweetId?: string; error?: string; skipped?: boolean };
}

function isRecentPublication(publishedAt?: string, wpPublishedAt?: string | null): boolean {
  const effectiveDate = wpPublishedAt || publishedAt;
  if (!effectiveDate) return true;
  const maxAgeMs = 48 * 60 * 60 * 1000;
  return Date.now() - new Date(effectiveDate).getTime() <= maxAgeMs;
}

export async function publishArticleToSocial(slug: string): Promise<PublishArticleSocialResult> {
  if (!socialConfig.enabled || !socialConfig.sendOnPublish) {
    return { ok: true, skipped: true, reason: 'social_disabled' };
  }

  if (!isFacebookConfigured() && !isXConfigured()) {
    return { ok: false, skipped: true, reason: 'social_not_configured' };
  }

  const article = await getArticleForSocial(slug);
  if (!article) {
    return { ok: false, skipped: true, reason: 'article_not_found' };
  }

  if (article.status !== 'published') {
    return { ok: true, skipped: true, reason: 'not_published' };
  }

  if (!isRecentPublication(article.publishedAt, article.wpPublishedAt)) {
    return { ok: true, skipped: true, reason: 'article_too_old' };
  }

  const result: PublishArticleSocialResult = { ok: true };

  if (isFacebookConfigured() && !article.facebookPostedAt) {
    const message = buildFacebookMessage(article.title, article.excerpt, article.articleUrl);
    const fb = await postToFacebook(message, article.articleUrl);
    result.facebook = fb.ok
      ? { ok: true, postId: fb.postId }
      : { ok: false, error: fb.error };

    if (fb.ok) {
      await markFacebookPosted(article.documentId);
    } else {
      result.ok = false;
    }
  } else if (article.facebookPostedAt) {
    result.facebook = { ok: true, skipped: true };
  } else {
    result.facebook = { ok: true, skipped: true };
  }

  if (isXConfigured() && !article.xPostedAt) {
    const text = buildXMessage(article.title, article.articleUrl);
    const x = await postToX(text);
    result.x = x.ok ? { ok: true, tweetId: x.tweetId } : { ok: false, error: x.error };

    if (x.ok) {
      await markXPosted(article.documentId);
    } else {
      result.ok = false;
    }
  } else if (article.xPostedAt) {
    result.x = { ok: true, skipped: true };
  } else {
    result.x = { ok: true, skipped: true };
  }

  return result;
}
