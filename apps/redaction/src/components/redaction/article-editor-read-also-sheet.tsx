'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Loader2, Search, X } from 'lucide-react';
import type { RedactionArticle } from '@/lib/redaction/types';
import {
  getArticleInternalPath,
} from '@/components/redaction/article-editor-link-sheet';

export interface ReadAlsoInsertPayload {
  href: string;
  title: string;
  category?: string;
  image?: string;
}

interface ArticleEditorReadAlsoSheetProps {
  open: boolean;
  bottomOffset?: number | string;
  onClose: () => void;
  onPick: (payload: ReadAlsoInsertPayload) => void;
}

function mediaPath(url?: string): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.pathname.startsWith('/uploads/') ||
        parsed.pathname.startsWith('/wp-content/')
      ) {
        return `${parsed.pathname}${parsed.search}`;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function ArticleEditorReadAlsoSheet({
  open,
  bottomOffset,
  onClose,
  onPick,
}: ArticleEditorReadAlsoSheetProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RedactionArticle[]>([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSearchError('');
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
          <p className="text-sm font-semibold">Insérer « À lire aussi »</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          Recherchez un article publié. L’encart affiche le libellé « Lire aussi » et le titre
          de l’article (avec miniature selon les réglages du site).
        </p>

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
              autoFocus
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </label>

        {searchError ? <p className="mb-2 text-xs text-red-600">{searchError}</p> : null}

        {results.length > 0 ? (
          <ul className="mb-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {results.map((article) => {
              const href = getArticleInternalPath(article);
              if (!href) return null;
              return (
                <li key={article.documentId}>
                  <button
                    type="button"
                    onClick={() =>
                      onPick({
                        href,
                        title: article.title,
                        category: article.category?.name,
                        image: mediaPath(article.featuredImage?.url),
                      })
                    }
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left active:bg-muted"
                  >
                    {article.featuredImage?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaPath(article.featuredImage.url)}
                        alt=""
                        className="mt-0.5 h-12 w-12 shrink-0 rounded-lg object-cover bg-muted"
                      />
                    ) : (
                      <span className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold text-foreground">
                        {article.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {article.category?.name ? `${article.category.name} · ` : ''}
                        {href}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.trim().length >= 2 && !loading ? (
          <p className="mb-3 text-xs text-muted-foreground">Aucun article publié trouvé.</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Tapez au moins 2 caractères.</p>
        )}
      </div>
    </div>
  );
}

export function buildReadAlsoShortcode(payload: ReadAlsoInsertPayload): string {
  const escapeAttr = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const parts = [
    `href="${escapeAttr(payload.href)}"`,
    `title="${escapeAttr(payload.title)}"`,
  ];
  if (payload.category?.trim()) {
    parts.push(`category="${escapeAttr(payload.category.trim())}"`);
  }
  if (payload.image?.trim()) {
    parts.push(`image="${escapeAttr(payload.image.trim())}"`);
  }
  return `[lire-aussi ${parts.join(' ')}]`;
}
