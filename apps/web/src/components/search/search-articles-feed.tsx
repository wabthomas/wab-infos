'use client';

import { useCallback } from 'react';
import type { Article } from '@wab-infos/shared';
import { ArticlesFeed } from '@/components/category/category-articles-feed';

const SEARCH_ACCENT = '#c41e3a';

interface SearchArticlesFeedProps {
  query: string;
  initialArticles: Article[];
  initialPage: number;
  pageCount: number;
  total: number;
}

export function SearchArticlesFeed({
  query,
  initialArticles,
  initialPage,
  pageCount,
  total,
}: SearchArticlesFeedProps) {
  const loadMoreUrl = useCallback(
    (page: number, pageSize: number) =>
      `/api/search/articles?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
    [query]
  );

  return (
    <ArticlesFeed
      feedKey={`search:${query}`}
      accentColor={SEARCH_ACCENT}
      initialArticles={initialArticles}
      initialPage={initialPage}
      pageCount={pageCount}
      total={total}
      emptyMessage="Aucun article trouvé. Essayez avec d’autres mots-clés."
      endMessage="Fin des résultats de recherche."
      loadMoreUrl={loadMoreUrl}
      showCategoryOnList
      rankedTitle="Résultats"
      galleryTitle="En images"
      listTitle="Autres résultats"
      loadMoreLabel="Voir plus de résultats"
    />
  );
}
