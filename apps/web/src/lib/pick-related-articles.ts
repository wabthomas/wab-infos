import type { Article } from '@wab-infos/shared';

/** Sélectionne jusqu’à `count` articles distincts (hors slug courant). */
export function pickRelatedArticles(
  articles: readonly Article[],
  excludeSlug: string,
  count: number
): Article[] {
  const pool = articles.filter((article) => article.slug !== excludeSlug);
  if (!pool.length || count <= 0) return [];

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function pickRandomRelatedArticle(
  articles: readonly Article[],
  excludeSlug: string
): Article | null {
  return pickRelatedArticles(articles, excludeSlug, 1)[0] ?? null;
}
