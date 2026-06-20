'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RedactionArticle } from '@/lib/redaction/types';
import { formatArticleDate, getArticleDisplayDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'published' | 'draft' | 'scheduled';

function statusLabel(status: RedactionArticle['status']): string {
  if (status === 'published') return 'Publié';
  if (status === 'scheduled') return 'Planifié';
  return 'Brouillon';
}

export default function RedactionArticlesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [articles, setArticles] = useState<RedactionArticle[]>([]);
  const [loading, setLoading] = useState(true);

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

      <div className="flex gap-2">
        {(['all', 'published', 'scheduled', 'draft'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
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
              <Link
                href={`/redaction/articles/${article.documentId}/edit`}
                className="block rounded-xl border border-border bg-card p-4"
              >
                <p className="font-semibold leading-snug">{article.title}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {article.category?.name ?? 'Sans rubrique'}
                  {' · '}
                  {statusLabel(article.status)}
                  {' · '}
                  {formatArticleDate(getArticleDisplayDate(article))}
                </p>
                {article.viewCount > 0 && (
                  <p className="mt-1 text-xs font-medium text-primary">{article.viewCount} vues</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
