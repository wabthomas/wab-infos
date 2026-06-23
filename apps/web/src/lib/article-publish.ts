/** Article publié (champ custom ou draftAndPublish Strapi) */
export function isArticlePublished(article: {
  status?: string;
  publishedAt?: string | null;
}): boolean {
  if (article.status === 'archived') return false;
  if (article.status === 'published') return true;
  return Boolean(article.publishedAt);
}

/** Publication récente (< 48 h) — évite envois massifs à l'import */
export function isRecentPublication(
  publishedAt?: string | null,
  wpPublishedAt?: string | null
): boolean {
  const effectiveDate = wpPublishedAt || publishedAt;
  if (!effectiveDate) return true;
  const maxAgeMs = 48 * 60 * 60 * 1000;
  return Date.now() - new Date(effectiveDate).getTime() <= maxAgeMs;
}
