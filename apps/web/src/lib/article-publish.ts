/** Article réellement publié dans Strapi (draft & publish + champ custom). */
export function isArticlePublished(article: {
  status?: string;
  publishedAt?: string | null;
}): boolean {
  if (!article.publishedAt) return false;
  if (article.status === 'archived' || article.status === 'draft' || article.status === 'scheduled') {
    return false;
  }
  return article.status === 'published';
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
