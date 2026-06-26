'use client';

import { CalendarClock, Loader2, Send, User, X } from 'lucide-react';
import type { RedactionAuthor, RedactionCategory } from '@/lib/redaction/types';
import { cn } from '@/lib/utils';

interface ArticlePublishSheetProps {
  open: boolean;
  mode: 'publish' | 'schedule';
  saving: boolean;
  categories: RedactionCategory[];
  primaryCategoryId: string;
  onPrimaryCategoryChange: (id: string) => void;
  canAssignAuthor: boolean;
  authors: RedactionAuthor[];
  authorDocumentId: string;
  onAuthorChange: (id: string) => void;
  currentAuthorName: string;
  scheduledAt: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArticlePublishSheet({
  open,
  mode,
  saving,
  categories,
  primaryCategoryId,
  onPrimaryCategoryChange,
  canAssignAuthor,
  authors,
  authorDocumentId,
  onAuthorChange,
  currentAuthorName,
  scheduledAt,
  onClose,
  onConfirm,
}: ArticlePublishSheetProps) {
  if (!open) return null;

  const selectedAuthor =
    authors.find((author) => author.documentId === authorDocumentId) ??
    authors.find((author) => author.name === currentAuthorName);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-sheet-title"
        className="relative max-h-[min(88dvh,720px)] overflow-y-auto rounded-t-2xl bg-background shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            {mode === 'schedule' ? (
              <CalendarClock className="h-5 w-5 text-primary" aria-hidden />
            ) : (
              <Send className="h-5 w-5 text-primary" aria-hidden />
            )}
            <h2 id="publish-sheet-title" className="font-display text-base font-bold">
              {mode === 'schedule' ? 'Planifier la publication' : 'Publier l’article'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-4 py-4">
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rubrique principale
            </p>
            <p className="text-xs text-muted-foreground">
              Détermine l’URL et la navigation sur le site public.
            </p>
            <div className="overflow-hidden rounded-xl border border-border">
              {categories.map((category) => {
                const active = primaryCategoryId === category.documentId;
                return (
                  <label
                    key={category.documentId}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 border-b border-border px-3 py-3 last:border-b-0',
                      active && 'bg-primary/5'
                    )}
                  >
                    <input
                      type="radio"
                      name="primary-category"
                      checked={active}
                      onChange={() => onPrimaryCategoryChange(category.documentId)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-semibold">{category.name}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Signature
            </p>
            {canAssignAuthor && authors.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Publier au nom d’un autre rédacteur (visible sur le site).
                </p>
                <select
                  value={authorDocumentId || selectedAuthor?.documentId || ''}
                  onChange={(e) => onAuthorChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                >
                  {authors.map((author) => (
                    <option key={author.documentId} value={author.documentId}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium">
                {currentAuthorName}
              </p>
            )}
          </section>

          {mode === 'schedule' && scheduledAt ? (
            <p className="text-xs text-muted-foreground">
              Publication prévue le{' '}
              <span className="font-semibold text-foreground">
                {new Date(scheduledAt).toLocaleString('fr-FR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              . Modifiez la date dans les réglages si besoin.
            </p>
          ) : null}
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            disabled={saving || !primaryCategoryId}
            onClick={onConfirm}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                En cours…
              </>
            ) : mode === 'schedule' ? (
              'Confirmer la planification'
            ) : (
              'Confirmer la publication'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
