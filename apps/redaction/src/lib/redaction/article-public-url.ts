import type { RedactionArticle } from '@/lib/redaction/types';

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
}

export function canViewArticlePublicly(article: RedactionArticle): boolean {
  const isLive = Boolean(article.publishedAt);
  return isLive && Boolean(article.category?.slug && article.slug);
}

export function getPublicArticleUrl(article: RedactionArticle): string | null {
  if (!canViewArticlePublicly(article)) return null;
  return `${siteOrigin()}/${article.category!.slug}/${article.slug}`;
}
