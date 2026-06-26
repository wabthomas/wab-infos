'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Check, ChevronDown, GripVertical, X, Zap } from 'lucide-react';
import type { RedactionCategory } from '@/lib/redaction/types';
import { cn } from '@/lib/utils';
import { FeaturedImageField } from '@/components/redaction/featured-image-field';

interface ArticleEditorSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  categories: RedactionCategory[];
  selectedCategoryIds: string[];
  onToggleCategory: (id: string) => void;
  onSetPrimaryCategory: (id: string) => void;
  excerpt: string;
  onExcerptChange: (v: string) => void;
  tagNames: string[];
  onTagNamesChange: (values: string[]) => void;
  seoTitle: string;
  onSeoTitleChange: (v: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (v: string) => void;
  canonicalUrl: string;
  onCanonicalUrlChange: (v: string) => void;
  featuredImageId?: number | null;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  onOpenMediaLibrary: () => void;
  onRemoveFeaturedImage: () => void;
  onEditFeaturedAlt?: () => void;
  savingFeaturedAlt?: boolean;
  editingFeaturedAlt?: boolean;
  featuredAltDraft?: string;
  onFeaturedAltDraftChange?: (v: string) => void;
  onSaveFeaturedAlt?: () => void;
  onCancelFeaturedAlt?: () => void;
  isBreaking: boolean;
  onBreakingChange: (v: boolean) => void;
  scheduledAt: string;
  onScheduledAtChange: (v: string) => void;
  minScheduleDate: string;
}

function tagsToInput(tagNames: string[]): string {
  return tagNames.join(', ');
}

function inputToTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function TagsInput({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
      placeholder="politique, kinshasa, économie"
    />
  );
}

export function ArticleEditorSettingsSheet({
  open,
  onClose,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onSetPrimaryCategory,
  excerpt,
  onExcerptChange,
  tagNames,
  onTagNamesChange,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
  canonicalUrl,
  onCanonicalUrlChange,
  featuredImageId,
  featuredImageUrl,
  featuredImageAlt,
  onOpenMediaLibrary,
  onRemoveFeaturedImage,
  onEditFeaturedAlt,
  savingFeaturedAlt,
  editingFeaturedAlt,
  featuredAltDraft,
  onFeaturedAltDraftChange,
  onSaveFeaturedAlt,
  onCancelFeaturedAlt,
  isBreaking,
  onBreakingChange,
  scheduledAt,
  onScheduledAtChange,
  minScheduleDate,
}: ArticleEditorSettingsSheetProps) {
  const [tagsDraft, setTagsDraft] = useState(tagsToInput(tagNames));

  useEffect(() => {
    if (open) setTagsDraft(tagsToInput(tagNames));
  }, [open, tagNames]);

  function commitTags() {
    onTagNamesChange(inputToTags(tagsDraft));
  }

  function handleClose() {
    commitTags();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Fermer les réglages"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-settings-title"
        className="relative max-h-[min(92dvh,780px)] overflow-y-auto rounded-t-2xl bg-background shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <h2 id="editor-settings-title" className="font-display text-base font-bold">
            Réglages de publication
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-4 py-4">
          <details className="group overflow-hidden rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rubriques
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {selectedCategoryIds.length
                    ? `${selectedCategoryIds.length} sélectionnée${selectedCategoryIds.length > 1 ? 's' : ''}`
                    : 'Choisir une rubrique'}
                </p>
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border px-3 pb-3 pt-2">
              <p className="mb-2 text-xs text-muted-foreground">
                La rubrique principale détermine l’URL sur le site. Utilisez « Principale » ou
                réordonnez via la publication.
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                {categories.map((category) => {
                  const checked = selectedCategoryIds.includes(category.documentId);
                  const primary = selectedCategoryIds[0] === category.documentId;

                  return (
                    <div
                      key={category.documentId}
                      className="flex items-center gap-2 border-b border-border px-3 py-3 last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleCategory(category.documentId)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                            checked
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background'
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{category.name}</span>
                          {primary && (
                            <span className="mt-0.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              Principale
                            </span>
                          )}
                        </span>
                      </button>
                      {checked && !primary ? (
                        <button
                          type="button"
                          onClick={() => onSetPrimaryCategory(category.documentId)}
                          className="shrink-0 rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary"
                        >
                          Principale
                        </button>
                      ) : (
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </details>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Photo à la une
            </p>
            <FeaturedImageField
              imageId={featuredImageId}
              imageUrl={featuredImageUrl}
              alternativeText={featuredImageAlt}
              onOpenLibrary={onOpenMediaLibrary}
              onRemove={onRemoveFeaturedImage}
              onEditAlt={onEditFeaturedAlt}
              savingAlt={savingFeaturedAlt}
              editingAlt={editingFeaturedAlt}
              altDraft={featuredAltDraft}
              onAltDraftChange={onFeaturedAltDraftChange}
              onSaveAlt={onSaveFeaturedAlt}
              onCancelAlt={onCancelFeaturedAlt}
            />
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
              placeholder="Généré automatiquement depuis le contenu (170 caractères)"
            />
            <p className="text-right text-[11px] text-muted-foreground">{excerpt.length}/500</p>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tags
            </p>
            <TagsInput value={tagsDraft} onChange={setTagsDraft} onCommit={commitTags} />
            <p className="text-[11px] text-muted-foreground">
              Séparez les tags par des virgules.
            </p>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              SEO
            </p>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Titre SEO</span>
              <input
                value={seoTitle}
                onChange={(e) => onSeoTitleChange(e.target.value)}
                maxLength={70}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                placeholder="Généré : titre + accroche du 1er paragraphe"
              />
              <span className="block text-right text-[11px] text-muted-foreground">
                {seoTitle.length}/70
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Description SEO</span>
              <textarea
                value={seoDescription}
                onChange={(e) => onSeoDescriptionChange(e.target.value)}
                rows={3}
                maxLength={160}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none focus:border-primary"
                placeholder="Générée depuis le premier paragraphe"
              />
              <span className="block text-right text-[11px] text-muted-foreground">
                {seoDescription.length}/160
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">URL canonique</span>
              <input
                type="url"
                inputMode="url"
                value={canonicalUrl}
                onChange={(e) => onCanonicalUrlChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-base outline-none focus:border-primary"
                placeholder="https://..."
              />
            </label>
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
            onClick={handleClose}
            className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
}
