'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpDown, Search, X } from 'lucide-react';
import type {
  ArticleListSort,
  RedactionArticle,
  RedactionAuthor,
  RedactionCategory,
} from '@/lib/redaction/types';
import { ArticleListItem } from '@/components/redaction/article-list-item';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'published' | 'draft' | 'scheduled' | 'imported';

const SORT_OPTIONS: { value: ArticleListSort; label: string }[] = [
  { value: 'updatedAt:desc', label: 'Plus récents' },
  { value: 'updatedAt:asc', label: 'Plus anciens' },
  { value: 'publishedAt:desc', label: 'Date de publication' },
  { value: 'views:desc', label: 'Vues (haut → bas)' },
  { value: 'views:asc', label: 'Vues (bas → haut)' },
  { value: 'seo:desc', label: 'Score SEO (haut → bas)' },
  { value: 'seo:asc', label: 'Score SEO (bas → haut)' },
  { value: 'category:asc', label: 'Catégorie (A → Z)' },
  { value: 'author:asc', label: 'Rédacteur (A → Z)' },
  { value: 'title:asc', label: 'Titre (A → Z)' },
];

function parseFilter(value: string | null): Filter {
  if (
    value === 'published' ||
    value === 'draft' ||
    value === 'scheduled' ||
    value === 'all' ||
    value === 'imported'
  ) {
    return value;
  }
  return 'published';
}

function parseSort(value: string | null): ArticleListSort {
  const match = SORT_OPTIONS.find((option) => option.value === value);
  return match?.value ?? 'updatedAt:desc';
}

export function RedactionArticlesList({
  initialIsSuperAdmin,
  initialCanDeleteAny,
  initialShowViews,
}: {
  initialIsSuperAdmin?: boolean;
  initialCanDeleteAny?: boolean;
  initialShowViews?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => parseFilter(searchParams.get('filter')));
  const [authorFilter, setAuthorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<ArticleListSort>(() => parseSort(searchParams.get('sort')));
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q')?.trim() ?? '');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q')?.trim() ?? '');
  const [articles, setArticles] = useState<RedactionArticle[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialIsSuperAdmin ?? false);
  const [canDeleteAny, setCanDeleteAny] = useState(initialCanDeleteAny ?? false);
  const [authors, setAuthors] = useState<RedactionAuthor[]>([]);
  const [categories, setCategories] = useState<RedactionCategory[]>([]);
  const [showViews, setShowViews] = useState(initialShowViews ?? true);
  const [draftCount, setDraftCount] = useState(0);
  const [importedDraftCount, setImportedDraftCount] = useState(0);
  const [profileReady, setProfileReady] = useState(
    initialIsSuperAdmin !== undefined && initialCanDeleteAny !== undefined
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFilter(parseFilter(searchParams.get('filter')));
    setSort(parseSort(searchParams.get('sort')));
  }, [searchParams]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    void fetchRedaction('/api/redaction/notifications/summary')
      .then((r) => r.json())
      .then((data: { draftCount?: number; importedDraftCount?: number }) => {
        setDraftCount(data.draftCount ?? 0);
        setImportedDraftCount(data.importedDraftCount ?? 0);
      })
      .catch(() => undefined);
  }, [articles, filter]);

  useEffect(() => {
    if (profileReady) return;

    void fetchRedaction('/api/redaction/auth/me')
      .then((r) => r.json())
      .then(
        (data: {
          isSuperAdmin?: boolean;
          canDeleteAnyArticle?: boolean;
        }) => {
          setIsSuperAdmin(Boolean(data.isSuperAdmin));
          setCanDeleteAny(Boolean(data.canDeleteAnyArticle));
        }
      )
      .catch(() => undefined)
      .finally(() => setProfileReady(true));

    if (initialShowViews === undefined) {
      void fetchRedaction('/api/redaction/site-settings')
        .then((r) => r.json())
        .then((data: { settings?: { showArticleViewCounts?: boolean } }) => {
          if (data.settings) {
            setShowViews(data.settings.showArticleViewCounts !== false);
          }
        })
        .catch(() => undefined);
    }
  }, [initialShowViews, profileReady]);

  useEffect(() => {
    void fetchRedaction('/api/redaction/categories')
      .then((r) => r.json())
      .then((data: { categories?: RedactionCategory[] }) => setCategories(data.categories ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void fetchRedaction('/api/redaction/authors')
      .then((r) => r.json())
      .then((data: { authors?: RedactionAuthor[] }) => setAuthors(data.authors ?? []))
      .catch(() => undefined);
  }, [isSuperAdmin]);

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (targetPage === 1 && !append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const statusParam = filter === 'imported' ? 'all' : filter;
        const params = new URLSearchParams({
          status: statusParam,
          page: String(targetPage),
          pageSize: '6',
          sort,
        });
        if (filter === 'imported') {
          params.set('imported', '1');
        }
        if (isSuperAdmin && authorFilter) {
          params.set('author', authorFilter);
        }
        if (categoryFilter) {
          params.set('category', categoryFilter);
        }
        if (searchQuery) {
          params.set('q', searchQuery);
        }

        const res = await fetchRedaction(`/api/redaction/articles?${params}`);
        const data = (await res.json()) as {
          articles?: RedactionArticle[];
          pagination?: { page: number; pageCount: number; total: number };
          error?: string;
        };

        if (!res.ok) throw new Error(data.error ?? 'Chargement impossible');

        const nextArticles = data.articles ?? [];
        const pagination = data.pagination;

        setPage(pagination?.page ?? targetPage);
        setPageCount(pagination?.pageCount ?? 1);
        setTotal(pagination?.total ?? nextArticles.length);
        setArticles((prev) => (append ? [...prev, ...nextArticles] : nextArticles));
      } catch {
        if (!append) setArticles([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [authorFilter, categoryFilter, filter, isSuperAdmin, searchQuery, sort]
  );

  useEffect(() => {
    if (!profileReady) return;
    setPage(1);
    void loadPage(1, false);
  }, [filter, authorFilter, categoryFilter, searchQuery, sort, loadPage, profileReady]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || loading || loadingMore || page >= pageCount) return;

    const scrollRoot = document.getElementById('redaction-main-scroll');

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadPage(page + 1, true);
        }
      },
      { root: scrollRoot, rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadPage, loading, loadingMore, page, pageCount]);

  function handlePublicationChange(documentId: string, article: RedactionArticle) {
    setArticles((list) => list.map((item) => (item.documentId === documentId ? article : item)));
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold lg:text-3xl">
            {isSuperAdmin ? 'Tous les articles' : 'Mes articles'}
          </h1>
          {total > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {total} article{total > 1 ? 's' : ''}
              {searchQuery ? ` pour « ${searchQuery} »` : ''}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:max-w-3xl lg:flex-1 lg:justify-end">
          <div className="relative min-w-0 flex-1 sm:min-w-[12rem] lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher un article…"
              className="h-10 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 lg:h-11"
              aria-label="Rechercher un article"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="sm:w-44 lg:w-48">
            <label htmlFor="article-sort" className="sr-only">
              Trier les articles
            </label>
            <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                id="article-sort"
                value={sort}
                onChange={(event) => setSort(parseSort(event.target.value))}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm lg:h-11"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="sm:w-44 lg:w-48">
              <label htmlFor="category-filter" className="sr-only">
                Filtrer par catégorie
              </label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm lg:h-11"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category.documentId} value={category.documentId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {isSuperAdmin && authors.length > 0 ? (
            <div className="sm:w-44 lg:w-52">
              <label htmlFor="author-filter" className="sr-only">
                Filtrer par rédacteur
              </label>
              <select
                id="author-filter"
                value={authorFilter}
                onChange={(event) => setAuthorFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm lg:h-11"
              >
                <option value="">Tous les rédacteurs</option>
                {authors.map((author) => (
                  <option key={author.documentId} value={author.documentId}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'published', 'scheduled', 'draft', 'imported'] as const).map((f) => {
          const count =
            f === 'draft' ? draftCount : f === 'imported' ? importedDraftCount : 0;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors lg:px-4 lg:py-2 lg:text-sm',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {f === 'all'
                ? 'Tous'
                : f === 'published'
                  ? 'Publiés'
                  : f === 'scheduled'
                    ? 'Planifiés'
                    : f === 'imported'
                      ? 'Importés'
                      : 'Brouillons'}
              {count > 0 ? (
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                    filter === f
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-red-600 text-white'
                  )}
                >
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : articles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {searchQuery ? `Aucun article pour « ${searchQuery} »` : 'Aucun article'}
        </p>
      ) : (
        <ul className="space-y-2">
          {articles.map((article) => (
            <li key={article.documentId}>
              <ArticleListItem
                article={article}
                canDeleteAny={canDeleteAny}
                showAuthor={isSuperAdmin}
                showViews={showViews}
                canManagePublication={isSuperAdmin}
                onDeleted={(id) => {
                  setArticles((list) => list.filter((a) => a.documentId !== id));
                  setTotal((value) => Math.max(0, value - 1));
                }}
                onPublicationChange={handlePublicationChange}
              />
            </li>
          ))}
        </ul>
      )}

      {loadingMore ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Chargement…</p>
      ) : null}

      {page < pageCount ? <div ref={loadMoreRef} className="h-4" aria-hidden /> : null}
    </div>
  );
}
