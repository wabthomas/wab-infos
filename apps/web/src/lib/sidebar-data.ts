import type { Article } from '@wab-infos/shared';
import { compareArticlesByDateDesc } from '@/lib/utils';
import { getMockArticlesIfEnabled } from '@/lib/mock-data';
import { getArticles } from '@/lib/strapi';

export async function getLiveFeed(limit = 4): Promise<Article[]> {
  try {
    const { articles } = await getArticles({ pageSize: limit });
    return articles.sort(compareArticlesByDateDesc);
  } catch {
    return getMockArticlesIfEnabled({ pageSize: limit }).sort(compareArticlesByDateDesc);
  }
}

export async function getTopReadArticles(limit = 5): Promise<Article[]> {
  try {
    const { articles } = await getArticles({ pageSize: 30 });
    return [...articles]
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, limit);
  } catch {
    return getMockArticlesIfEnabled({ pageSize: limit });
  }
}
