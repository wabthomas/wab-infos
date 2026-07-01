'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RedactionArticle, RedactionAuthor } from '@/lib/redaction/types';
import { ArticleListItem } from '@/components/redaction/article-list-item';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'published' | 'draft' | 'scheduled';

function parseFilter(value: string | null): Filter {
  if (value === 'published' || value === 'draft' || value === 'scheduled' || value === 'all') {
    return value;
  }
  return 'all';
}

export function RedactionArticlesList() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => parseFilter(searchParams.get('filter')));
  const [authorFilter, setAuthorFilter] = useState('');
  const [articles, setArticles] = useState<RedactionArticle[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canDeleteAny, setCanDeleteAny] = useState(false);
  const [authors, setAuthors] = useState<RedactionAuthor[]>([]);
  const [showViews, setShowViews] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilter(parseFilter(searchParams.get('filter')));
  }, [searchParams]);

  useEffect(() => {
    void fetch('/api/redaction/auth/me')
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
      .catch(() => undefined);

    void fetch('/api/redaction/site-settings')
      .then((r) => r.json())
      .then((data: { settings?: { showArticleViewCounts?: boolean } }) => {
        if (data.settings) {
          setShowViews(data.settings.showArticleViewCounts !== false);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void fetch('/api/redaction/authors')
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
        const params = new URLSearchParams({
          status: filter,
          page: String(targetPage),
          pageSize: '6',
        });
        if (isSuperAdmin && authorFilter) {
          params.set('author', authorFilter);
        }

        const res = await fetch(`/api/redaction/articles?${params}`);
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
    [authorFilter, filter, isSuperAdmin]
  );

  useEffect(() => {
    setPage(1);
    void loadPage(1, false);
  }, [filter, authorFilter, loadPage]);

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
            </p>
          ) : null}
        </div>

        {isSuperAdmin && authors.length > 0 ? (
          <div className="lg:w-64">
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

      <div className="flex flex-wrap gap-2">
        {(['all', 'published', 'scheduled', 'draft'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors lg:px-4 lg:py-2 lg:text-sm',
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
                  : 'Brouillons'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : articles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Aucun article
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
