'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RedactionArticle } from '@/lib/redaction/types';
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
  const [articles, setArticles] = useState<RedactionArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [canDeleteAny, setCanDeleteAny] = useState(false);

  useEffect(() => {
    setFilter(parseFilter(searchParams.get('filter')));
  }, [searchParams]);

  useEffect(() => {
    void fetch('/api/redaction/auth/me')
      .then((r) => r.json())
      .then((data: { canDeleteAnyArticle?: boolean }) => {
        setCanDeleteAny(Boolean(data.canDeleteAnyArticle));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/redaction/articles?status=${filter}`)
      .then((r) => r.json())
      .then((d: { articles?: RedactionArticle[] }) => setArticles(d.articles ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Mes articles</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'published', 'scheduled', 'draft'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
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
                onDeleted={(id) => setArticles((list) => list.filter((a) => a.documentId !== id))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
