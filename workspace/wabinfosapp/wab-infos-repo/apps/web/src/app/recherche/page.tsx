import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ArticleCard } from '@/components/articles/article-card';
import { SearchPageClient } from '@/components/search/search-form';
import { siteConfig } from '@/config/site';
import { getMockArticlesIfEnabled } from '@/lib/mock-data';
import { searchArticles } from '@/lib/strapi';

export const metadata: Metadata = {
  title: 'Recherche',
  description: `Rechercher des articles sur ${siteConfig.name}`,
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, page: pageStr } = await searchParams;
  const query = q?.trim() ?? '';
  const page = parseInt(pageStr ?? '1', 10);

  let articles: Awaited<ReturnType<typeof searchArticles>>['articles'] = [];
  let total = 0;

  if (query) {
    try {
      const result = await searchArticles(query, page);
      articles = result.articles;
      total = result.pagination.total;
    } catch {
      const mock = getMockArticlesIfEnabled().filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(query.toLowerCase())
      );
      articles = mock;
      total = mock.length;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Recherche</h1>

      <div className="mb-8 max-w-xl">
        <Suspense>
          <SearchPageClient />
        </Suspense>
      </div>

      {query && (
        <div>
          <p className="mb-6 text-sm text-muted-foreground">
            {total} résultat{total !== 1 ? 's' : ''} pour &laquo;&nbsp;{query}&nbsp;&raquo;
          </p>

          {articles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucun article trouvé. Essayez avec d&apos;autres mots-clés.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
