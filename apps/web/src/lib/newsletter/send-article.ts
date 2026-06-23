import type { Article } from '@wab-infos/shared';
import { getArticlePath, resolveArticleCategorySlug } from '@/config/site';
import { getStrapiMediaUrl } from '@/lib/utils';
import { isArticlePublished } from '@/lib/article-publish';
import {
  buildArticleNewsletterSubject,
  renderArticleNewsletterHtml,
  renderArticleNewsletterText,
  type ArticleNewsletterData,
} from '@/lib/newsletter/article-template';
import { isNewsletterConfigured, newsletterConfig } from '@/lib/newsletter/config';
import { sendBatchEmails } from '@/lib/newsletter/transport';
import {
  buildUnsubscribeUrl,
  getActiveSubscribers,
  getArticleForNewsletter,
  markArticleNewsletterSent,
} from '@/lib/newsletter/subscribers';

export interface SendArticleNewsletterResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  sent?: number;
  failed?: number;
  subscribers?: number;
}

function mapStrapiArticleToPayload(
  article: NonNullable<Awaited<ReturnType<typeof getArticleForNewsletter>>>,
  unsubscribeUrl: string
): ArticleNewsletterData {
  const categorySlug = article.category?.slug ?? 'actualite';
  const articleUrl = `${newsletterConfig.siteUrl}${getArticlePath(
    { slug: article.slug, category: article.category },
    categorySlug
  )}`;

  const imageUrl =
    getStrapiMediaUrl(article.featuredImage?.url) ??
    `${newsletterConfig.siteUrl}/og-default.jpg`;

  return {
    title: article.seoTitle || article.title,
    excerpt: article.excerpt,
    articleUrl,
    imageUrl,
    categoryName: article.category?.name,
    categoryColor: article.category?.color,
    authorName: article.author?.name,
    publishedAt: article.publishedAt,
    unsubscribeUrl,
    isBreaking: article.isBreaking ?? false,
  };
}

export function mapArticleToNewsletterPreview(article: Article, unsubscribeUrl: string): ArticleNewsletterData {
  const categorySlug = resolveArticleCategorySlug(article);
  const articleUrl = `${newsletterConfig.siteUrl}${getArticlePath(article, categorySlug)}`;
  const imageUrl =
    getStrapiMediaUrl(article.featuredImage?.url) ??
    `${newsletterConfig.siteUrl}/og-default.jpg`;

  return {
    title: article.seoTitle || article.title,
    excerpt: article.excerpt,
    articleUrl,
    imageUrl,
    categoryName: article.category?.name,
    categoryColor: article.category?.color,
    authorName: article.author?.name,
    publishedAt: article.publishedAt,
    unsubscribeUrl,
    isBreaking: article.isBreaking,
  };
}

async function fetchArticleForNewsletter(
  slug: string
): Promise<Awaited<ReturnType<typeof getArticleForNewsletter>> | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const article = await getArticleForNewsletter(slug);
    if (article) return article;
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  return null;
}

export async function sendArticleNewsletter(slug: string): Promise<SendArticleNewsletterResult> {
  if (!newsletterConfig.enabled) {
    return { ok: true, skipped: true, reason: 'newsletter_disabled' };
  }

  if (!isNewsletterConfigured()) {
    return { ok: false, skipped: true, reason: 'mail_not_configured' };
  }

  const article = await fetchArticleForNewsletter(slug);
  if (!article) {
    return { ok: false, skipped: true, reason: 'article_not_found' };
  }

  if (!isArticlePublished(article)) {
    return { ok: true, skipped: true, reason: 'not_published' };
  }

  if (article.newsletterSentAt) {
    return { ok: true, skipped: true, reason: 'already_sent' };
  }

  const subscribers = await getActiveSubscribers();
  if (subscribers.length === 0) {
    return { ok: true, skipped: true, reason: 'no_subscribers', subscribers: 0 };
  }

  const emails = subscribers.map((subscriber) => {
    const payload = mapStrapiArticleToPayload(
      article,
      buildUnsubscribeUrl(subscriber.unsubscribeToken)
    );

    return {
      to: subscriber.email,
      subject: buildArticleNewsletterSubject(payload),
      html: renderArticleNewsletterHtml(payload),
      text: renderArticleNewsletterText(payload),
      unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),
      replyTo: newsletterConfig.replyTo,
    };
  });

  const { sent, failed } = await sendBatchEmails(emails);

  if (sent > 0) {
    await markArticleNewsletterSent(article.documentId);
  }

  return {
    ok: failed === 0,
    sent,
    failed,
    subscribers: subscribers.length,
  };
}
