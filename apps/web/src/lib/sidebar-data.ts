import type { Article } from '@wab-infos/shared';
import { compareArticlesByDateDesc } from '@/lib/utils';
import { getMockArticles } from '@/lib/mock-data';
import { getArticles } from '@/lib/strapi';

export async function getLiveFeed(limit = 4): Promise<Article[]> {
  try {
    const { articles } = await getArticles({ pageSize: limit });
    return articles.sort(compareArticlesByDateDesc);
  } catch {
    return getMockArticles({ pageSize: limit }).sort(compareArticlesByDateDesc);
  }
}

export async function getTopReadArticles(limit = 5): Promise<Article[]> {
  try {
    const { articles } = await getArticles({ pageSize: 30 });
    return [...articles]
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, limit);
  } catch {
    return getMockArticles({ pageSize: limit });
  }
}
