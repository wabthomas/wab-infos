'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpDown, Loader2, Search, Sparkles, Trash2, X } from 'lucide-react';
import type {
  ArticleListSort,
  RedactionArticle,
  RedactionAuthor,
  RedactionCategory,
} from '@/lib/redaction/types';
import { ArticleListItem } from '@/components/redaction/article-list-item';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { isLiveRedactionArticle } from '@/lib/redaction/status-label';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState<'reformulate' | 'delete' | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();
  const selectionEnabled = filter === 'draft' || filter === 'imported';

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
    setSelectedIds([]);
    void loadPage(1, false);
  }, [filter, authorFilter, categoryFilter, searchQuery, sort, loadPage, profileReady]);

  useEffect(() => {
    if (selectionEnabled) return;
    setSelectedIds([]);
  }, [selectionEnabled]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => articles.some((article) => article.documentId === id))
    );
  }, [articles]);

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

  const selectedArticles = useMemo(
    () => articles.filter((article) => selectedIds.includes(article.documentId)),
    [articles, selectedIds]
  );
  const reformulableSelected = useMemo(
    () =>
      selectedArticles.filter(
        (article) =>
          isSuperAdmin &&
          Boolean(article.isImported) &&
          !isLiveRedactionArticle(article) &&
          !article.aiProcessedAt
      ),
    [selectedArticles, isSuperAdmin]
  );
  const deletableSelected = useMemo(
    () =>
      selectedArticles.filter((article) => {
        const isDraft = article.status === 'draft' && !article.publishedAt;
        return canDeleteAny || isDraft;
      }),
    [selectedArticles, canDeleteAny]
  );
  const allVisibleSelected =
    selectionEnabled &&
    articles.length > 0 &&
    articles.every((article) => selectedIds.includes(article.documentId));

  function toggleSelected(documentId: string, selected: boolean) {
    setSelectedIds((current) => {
      if (selected) {
        return current.includes(documentId) ? current : [...current, documentId];
      }
      return current.filter((id) => id !== documentId);
    });
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(articles.map((article) => article.documentId));
  }

  async function bulkDelete() {
    if (!deletableSelected.length || bulkBusy) return;
    const confirmed = window.confirm(
      `Supprimer ${deletableSelected.length} brouillon${
        deletableSelected.length > 1 ? 's' : ''
      } ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setBulkBusy('delete');
    let ok = 0;
    let failed = 0;
    for (const article of deletableSelected) {
      try {
        const res = await fetchRedaction(`/api/redaction/articles/${article.documentId}`, {
          method: 'DELETE',
        });
        const data = await readApiJsonResponse<{ error?: string }>(res);
        if (!res.ok) throw new Error(data.error ?? 'Suppression impossible');
        ok += 1;
        setArticles((list) => list.filter((row) => row.documentId !== article.documentId));
        setTotal((value) => Math.max(0, value - 1));
        setSelectedIds((ids) => ids.filter((id) => id !== article.documentId));
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(null);
    if (ok) toast.success(`${ok} brouillon${ok > 1 ? 's' : ''} supprimé${ok > 1 ? 's' : ''}`);
    if (failed) toast.error(`${failed} suppression${failed > 1 ? 's' : ''} impossible${failed > 1 ? 's' : ''}`);
  }

  async function bulkReformulate() {
    if (!reformulableSelected.length || bulkBusy) return;
    const confirmed = window.confirm(
      `Reformuler ${reformulableSelected.length} article${
        reformulableSelected.length > 1 ? 's' : ''
      } importé${reformulableSelected.length > 1 ? 's' : ''} avec l’IA ?`
    );
    if (!confirmed) return;

    setBulkBusy('reformulate');
    let ok = 0;
    let failed = 0;
    for (const article of reformulableSelected) {
      try {
        const res = await fetchRedaction('/api/redaction/ai/reformulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: article.documentId }),
        });
        const data = await readApiJsonResponse<{
          published?: boolean;
          seoScore?: number;
          title?: string;
          error?: string;
        }>(res);
        if (!res.ok) throw new Error(data.error ?? 'Reformulation impossible');
        ok += 1;
        handlePublicationChange(article.documentId, {
          ...article,
          title: data.title || article.title,
          status: data.published ? 'published' : 'draft',
          aiAssisted: true,
          seoScore: data.seoScore,
          aiProcessedAt: new Date().toISOString(),
        });
        setSelectedIds((ids) => ids.filter((id) => id !== article.documentId));
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(null);
    if (ok) toast.success(`${ok} article${ok > 1 ? 's' : ''} reformulé${ok > 1 ? 's' : ''}`);
    if (failed) toast.error(`${failed} reformulation${failed > 1 ? 's' : ''} impossible${failed > 1 ? 's' : ''}`);
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

      {selectionEnabled && articles.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4 rounded border-border text-primary accent-primary"
            />
            Tout sélectionner
          </label>
          <span className="text-xs text-muted-foreground">
            {selectedIds.length
              ? `${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}`
              : 'Cochez les brouillons à traiter'}
          </span>
        </div>
      ) : null}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : articles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {searchQuery ? `Aucun article pour « ${searchQuery} »` : 'Aucun article'}
        </p>
      ) : (
        <ul className={cn('space-y-2', selectedIds.length > 0 && 'pb-20')}>
          {articles.map((article) => (
            <li key={article.documentId}>
              <ArticleListItem
                article={article}
                canDeleteAny={canDeleteAny}
                showAuthor={isSuperAdmin}
                showViews={showViews}
                canManagePublication={isSuperAdmin}
                selectable={selectionEnabled}
                selected={selectedIds.includes(article.documentId)}
                onSelectedChange={toggleSelected}
                onDeleted={(id) => {
                  setArticles((list) => list.filter((a) => a.documentId !== id));
                  setTotal((value) => Math.max(0, value - 1));
                  setSelectedIds((ids) => ids.filter((row) => row !== id));
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

      {selectionEnabled && selectedIds.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur lg:bottom-0 lg:left-[var(--redaction-sidebar-w,0px)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-semibold">
              {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
            </p>
            {isSuperAdmin ? (
              <button
                type="button"
                disabled={!reformulableSelected.length || Boolean(bulkBusy)}
                onClick={() => void bulkReformulate()}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-violet-700 px-3.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {bulkBusy === 'reformulate' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Reformuler
                {reformulableSelected.length
                  ? ` (${reformulableSelected.length})`
                  : ''}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!deletableSelected.length || Boolean(bulkBusy)}
              onClick={() => void bulkDelete()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-red-600 px-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {bulkBusy === 'delete' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
              {deletableSelected.length ? ` (${deletableSelected.length})` : ''}
            </button>
            <button
              type="button"
              disabled={Boolean(bulkBusy)}
              onClick={() => setSelectedIds([])}
              className="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
