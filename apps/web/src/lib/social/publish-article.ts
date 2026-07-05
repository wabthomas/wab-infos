import {
  getArticleForSocial,
  markFacebookPosted,
  markXPosted,
} from '@/lib/social/article-data';
import { buildFacebookMessage, buildXMessage } from '@/lib/social/build-post';
import { isFacebookConfigured, isXConfigured, socialConfig } from '@/lib/social/config';
import { postToFacebook } from '@/lib/social/facebook';
import { postToX } from '@/lib/social/x';
import { resolveArticleOgImage } from '@/lib/og-image-url';

export interface PublishArticleSocialResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  facebook?: { ok: boolean; postId?: string; error?: string; skipped?: boolean };
  x?: { ok: boolean; tweetId?: string; error?: string; skipped?: boolean };
}

const inFlightSocialPublishes = new Set<string>();

function publicationTimestamp(
  publishedAt?: string,
  wpPublishedAt?: string | null
): number {
  const times = [publishedAt, wpPublishedAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));
  return times.length ? Math.max(...times) : 0;
}

function isRecentPublication(publishedAt?: string, wpPublishedAt?: string | null): boolean {
  const publishedMs = publicationTimestamp(publishedAt, wpPublishedAt);
  if (!publishedMs) return false;
  const maxAgeMs = 48 * 60 * 60 * 1000;
  return Date.now() - publishedMs <= maxAgeMs;
}

async function getArticleForSocialWithRetry(
  slug: string,
  attempts = 4
): Promise<Awaited<ReturnType<typeof getArticleForSocial>>> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const article = await getArticleForSocial(slug);
    if (article?.status === 'published') return article;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  return getArticleForSocial(slug);
}

export async function publishArticleToSocial(slug: string): Promise<PublishArticleSocialResult> {
  if (inFlightSocialPublishes.has(slug)) {
    return { ok: true, skipped: true, reason: 'already_in_flight' };
  }
  inFlightSocialPublishes.add(slug);

  try {
    return await publishArticleToSocialInner(slug);
  } finally {
    inFlightSocialPublishes.delete(slug);
  }
}

async function publishArticleToSocialInner(slug: string): Promise<PublishArticleSocialResult> {
  if (!socialConfig.enabled || !socialConfig.sendOnPublish) {
    return { ok: true, skipped: true, reason: 'social_disabled' };
  }

  if (!isFacebookConfigured() && !isXConfigured()) {
    return { ok: false, skipped: true, reason: 'social_not_configured' };
  }

  const article = await getArticleForSocialWithRetry(slug);
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
    const message = buildFacebookMessage(article.title, article.excerpt);
    const ogImage = resolveArticleOgImage({
      title: article.title,
      featuredImage: article.featuredImage,
      content: article.content ?? '',
    });
    const fb = await postToFacebook(message, article.articleUrl, {
      picture: ogImage.url,
      name: article.title,
      description: article.excerpt,
    });
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
