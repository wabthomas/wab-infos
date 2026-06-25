'use client';

import Image from 'next/image';
import { CalendarClock, Camera, Loader2, X, Zap } from 'lucide-react';
import type { RedactionCategory } from '@/lib/redaction/types';
import { cn, getStrapiMediaUrl } from '@/lib/utils';

interface ArticleEditorSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  categories: RedactionCategory[];
  excerpt: string;
  onExcerptChange: (v: string) => void;
  categoryDocumentId: string;
  onCategoryChange: (id: string) => void;
  featuredImageUrl?: string;
  onFeaturedImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  isBreaking: boolean;
  onBreakingChange: (v: boolean) => void;
  scheduledAt: string;
  onScheduledAtChange: (v: string) => void;
  minScheduleDate: string;
}

export function ArticleEditorSettingsSheet({
  open,
  onClose,
  categories,
  excerpt,
  onExcerptChange,
  categoryDocumentId,
  onCategoryChange,
  featuredImageUrl,
  onFeaturedImageChange,
  uploading,
  isBreaking,
  onBreakingChange,
  scheduledAt,
  onScheduledAtChange,
  minScheduleDate,
}: ArticleEditorSettingsSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Fermer les réglages"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-settings-title"
        className="relative max-h-[min(88dvh,640px)] overflow-y-auto rounded-t-2xl bg-background shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <h2 id="editor-settings-title" className="font-display text-base font-bold">
            Réglages de publication
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rubrique
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.documentId}
                  type="button"
                  onClick={() => onCategoryChange(c.documentId)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                    categoryDocumentId === c.documentId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Photo à la une
            </p>
            <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
              {featuredImageUrl ? (
                <div className="relative aspect-[16/10] max-h-44">
                  <Image
                    src={getStrapiMediaUrl(featuredImageUrl) ?? featuredImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/10] max-h-36 flex-col items-center justify-center gap-1.5 text-muted-foreground">
                  {uploading ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <Camera className="h-7 w-7" />
                  )}
                  <span className="text-sm">Ajouter une image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFeaturedImageChange}
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={uploading}
                aria-label="Photo à la une"
              />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Chapô
            </p>
            <textarea
              value={excerpt}
              onChange={(e) => onExcerptChange(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-primary"
              placeholder="Résumé court pour le site et les réseaux"
            />
            <p className="text-right text-[11px] text-muted-foreground">{excerpt.length}/500</p>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => onBreakingChange(!isBreaking)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                isBreaking
                  ? 'bg-red-600 text-white'
                  : 'border border-border bg-card text-foreground'
              )}
            >
              <Zap className="h-4 w-4" />
              {isBreaking ? 'Flash info — activé' : 'Marquer en flash info'}
            </button>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Planifier la publication
              </span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => onScheduledAtChange(e.target.value)}
                min={minScheduleDate}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
              />
              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => onScheduledAtChange('')}
                  className="text-xs font-medium text-primary"
                >
                  Supprimer la planification
                </button>
              )}
            </label>
          </section>
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
}
