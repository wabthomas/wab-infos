import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchPageClient } from '@/components/search/search-form';
import { SearchArticlesFeed } from '@/components/search/search-articles-feed';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ContentSidebar } from '@/components/layout/content-sidebar';
import { siteConfig } from '@/config/site';
import { getMockArticlesIfEnabled } from '@/lib/mock-data';
import { isLowMemBuild } from '@/lib/build-phase';
import { getLiveFeed } from '@/lib/sidebar-data';
import { searchArticles } from '@/lib/strapi';

export const metadata: Metadata = {
  title: 'Recherche',
  description: `Rechercher des articles sur ${siteConfig.name}`,
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const SEARCH_INITIAL_PAGE_SIZE = 12;
const SEARCH_INITIAL_PAGE_SIZE_LOW_MEM = 8;
const SEARCH_ACCENT = '#c41e3a';

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const pageSize = isLowMemBuild()
    ? SEARCH_INITIAL_PAGE_SIZE_LOW_MEM
    : SEARCH_INITIAL_PAGE_SIZE;

  let articles: Awaited<ReturnType<typeof searchArticles>>['articles'] = [];
  let pagination = { total: 0, pageCount: 0 };

  const livePromise = getLiveFeed(4);

  if (query) {
    try {
      const result = await searchArticles(query, 1, pageSize);
      articles = result.articles;
      pagination = result.pagination;
    } catch {
      const mock = getMockArticlesIfEnabled().filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(query.toLowerCase())
      );
      articles = mock.slice(0, pageSize);
      pagination = {
        total: mock.length,
        pageCount: Math.max(1, Math.ceil(mock.length / pageSize)),
      };
    }
  }

  let liveFeed: Awaited<ReturnType<typeof getLiveFeed>>;
  try {
    liveFeed = await livePromise;
  } catch {
    liveFeed = getMockArticlesIfEnabled({ pageSize: 4 });
  }

  const totalLabel =
    query && pagination.total > 0
      ? `${pagination.total} résultat${pagination.total > 1 ? 's' : ''}`
      : null;

  return (
    <div className="container mx-auto px-3 pb-10 pt-4 sm:px-4 sm:py-8">
      <div className="mb-3 sm:mb-4">
        <Breadcrumbs
          items={
            query
              ? [{ name: 'Recherche', href: '/recherche' }, { name: query }]
              : [{ name: 'Recherche' }]
          }
        />
      </div>

      <header
        className="relative mb-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm sm:mb-10"
        style={{
          backgroundImage: `linear-gradient(135deg, ${SEARCH_ACCENT}14 0%, transparent 55%)`,
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1 sm:w-1.5"
          style={{ backgroundColor: SEARCH_ACCENT }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-[0.12] blur-3xl"
          style={{ backgroundColor: SEARCH_ACCENT }}
          aria-hidden
        />
        <div className="relative px-4 py-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] sm:text-xs sm:tracking-widest"
              style={{ color: SEARCH_ACCENT }}
            >
              Recherche
            </p>
            {totalLabel ? (
              <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/70 sm:text-[11px]">
                {totalLabel}
              </span>
            ) : null}
          </div>
          <h1
            className="font-display mt-1.5 text-2xl font-bold tracking-tight sm:mt-2 sm:text-3xl md:text-4xl"
            style={{ color: SEARCH_ACCENT }}
          >
            {query ? (
              <>
                Résultats pour «&nbsp;{query}&nbsp;»
              </>
            ) : (
              'Rechercher'
            )}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
            {query
              ? `Articles et sujets trouvés sur ${siteConfig.name}`
              : `Trouvez un article, un sujet ou un auteur sur ${siteConfig.name}`}
          </p>

          <div className="mt-4 max-w-xl sm:mt-5">
            <Suspense>
              <SearchPageClient />
            </Suspense>
          </div>
        </div>
      </header>

      {query ? (
        <div className="grid items-start gap-8 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <SearchArticlesFeed
              query={query}
              initialArticles={articles}
              initialPage={1}
              pageCount={Math.max(1, pagination.pageCount)}
              total={pagination.total}
            />
          </div>
          <div className="hidden min-w-0 h-fit w-full lg:block lg:self-start">
            <ContentSidebar
              liveFeed={liveFeed}
              articles={articles.length > 4 ? articles.slice(4, 12) : articles}
              articlesTitle={articles.length > 0 ? 'Dans les résultats' : 'À la une'}
              articlesLink={{ href: `/recherche?q=${encodeURIComponent(query)}`, label: 'Retour' }}
              showCategories
            />
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              Saisissez un mot-clé pour lancer la recherche.
            </p>
          </div>
          <div className="hidden min-w-0 h-fit w-full lg:block lg:self-start">
            <ContentSidebar liveFeed={liveFeed} showCategories />
          </div>
        </div>
      )}
    </div>
  );
}
