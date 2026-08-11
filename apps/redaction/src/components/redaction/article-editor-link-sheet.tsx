'use client';

import { useEffect, useState } from 'react';
import { Link2, Loader2, Search, X } from 'lucide-react';
import type { RedactionArticle } from '@/lib/redaction/types';
import { cn } from '@/lib/utils';

export function getArticleInternalPath(
  article: Pick<RedactionArticle, 'slug' | 'category'>
): string | null {
  if (!article.category?.slug || !article.slug) return null;
  return `/${article.category.slug}/${article.slug}`;
}

interface ArticleEditorLinkSheetProps {
  open: boolean;
  url: string;
  selectedText?: string;
  bottomOffset?: number | string;
  error?: string;
  onUrlChange: (url: string) => void;
  onApply: () => void;
  onRemove: () => void;
  onClose: () => void;
  onPickHref: (href: string) => void;
}

export function ArticleEditorLinkSheet({
  open,
  url,
  selectedText,
  bottomOffset,
  error,
  onUrlChange,
  onApply,
  onRemove,
  onClose,
  onPickHref,
}: ArticleEditorLinkSheetProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RedactionArticle[]>([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSearchError('');
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setSearchError('');
      void fetch(
        `/api/redaction/articles?status=published&page=1&pageSize=8&q=${encodeURIComponent(q)}`
      )
        .then(async (res) => {
          const data = (await res.json()) as {
            articles?: RedactionArticle[];
            error?: string;
          };
          if (!res.ok) throw new Error(data.error ?? 'Recherche impossible');
          setResults(data.articles ?? []);
        })
        .catch((err) => {
          setResults([]);
          setSearchError(err instanceof Error ? err.message : 'Recherche impossible');
        })
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  if (!open) return null;

  return (
    <div
      className="redaction-editor-fixed-panel z-[70] border-t border-border bg-background px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      style={{
        bottom: bottomOffset,
        paddingBottom:
          typeof bottomOffset === 'number' && bottomOffset > 0
            ? '0.75rem'
            : 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="redaction-editor-width max-h-[min(62dvh,420px)] overflow-y-auto">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Insérer un lien</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {selectedText ? (
          <p className="mb-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Texte sélectionné :{' '}
            <span className="font-semibold text-foreground">« {selectedText} »</span>
          </p>
        ) : (
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
            Aucune sélection — le titre de l’article ou l’URL sera utilisé comme texte du lien.
          </p>
        )}

        <label className="mb-3 block space-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Rechercher un article
          </span>
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titre, rubrique…"
              className="h-11 w-full rounded-xl border border-border bg-card px-3 pr-10 text-base outline-none focus:border-primary"
              autoComplete="off"
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </label>

        {searchError ? <p className="mb-2 text-xs text-red-600">{searchError}</p> : null}

        {results.length > 0 ? (
          <ul className="mb-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {results.map((article) => {
              const href = getArticleInternalPath(article);
              if (!href) return null;
              return (
                <li key={article.documentId}>
                  <button
                    type="button"
                    onClick={() => onPickHref(href)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left active:bg-muted"
                  >
                    <span className="line-clamp-2 text-sm font-semibold text-foreground">
                      {article.title}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">{href}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.trim().length >= 2 && !loading ? (
          <p className="mb-3 text-xs text-muted-foreground">Aucun article publié trouvé.</p>
        ) : null}

        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            Lien personnalisé
          </span>
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://… ou /rubrique/slug"
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onApply();
              }
            }}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Interne : <code className="text-[10px]">/politique/mon-article</code> · Externe :{' '}
            <code className="text-[10px]">https://exemple.com</code>
          </p>
        </label>

        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'h-10 flex-1 rounded-xl border border-border text-sm font-medium',
              'text-muted-foreground active:bg-muted'
            )}
          >
            Retirer
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-10 flex-[1.4] rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
