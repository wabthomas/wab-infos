import { getMockArticles } from '@/lib/mock-data';
import { searchArticles } from '@/lib/strapi';

export interface SearchSuggestion {
  id: number;
  title: string;
  slug: string;
  categorySlug: string;
  excerpt: string;
}

function toSuggestion(article: {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category?: { slug?: string };
}): SearchSuggestion {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    categorySlug: article.category?.slug ?? 'actualite',
    excerpt: article.excerpt,
  };
}

function scoreMockMatch(
  article: { title: string; excerpt: string; tags?: { name: string }[] },
  query: string
): number {
  const q = query.toLowerCase();
  const title = article.title.toLowerCase();
  const excerpt = article.excerpt.toLowerCase();

  let score = 0;
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 50;
  else if (title.includes(q)) score += 30;

  if (excerpt.includes(q)) score += 10;

  for (const tag of article.tags ?? []) {
    if (tag.name.toLowerCase().includes(q)) score += 8;
  }

  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (title.includes(word)) score += 5;
  }

  return score;
}

function searchMockSuggestions(query: string, limit: number): SearchSuggestion[] {
  return getMockArticles()
    .map((article) => ({ article, score: scoreMockMatch(article, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ article }) => toSuggestion(article));
}

export async function getSearchSuggestions(
  query: string,
  limit = 6
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const result = await searchArticles(trimmed, 1);
    if (result.articles.length > 0) {
      return result.articles.slice(0, limit).map(toSuggestion);
    }
    return searchMockSuggestions(trimmed, limit);
  } catch {
    return searchMockSuggestions(trimmed, limit);
  }
}
