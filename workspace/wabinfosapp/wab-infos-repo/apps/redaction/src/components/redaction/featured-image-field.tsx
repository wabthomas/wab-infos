'use client';

import Image from 'next/image';
import { FolderOpen, ImageIcon, Loader2, Pencil, Trash2 } from 'lucide-react';
import { cn, getStrapiMediaUrl } from '@/lib/utils';

interface FeaturedImageFieldProps {
  imageId?: number | null;
  imageUrl?: string;
  alternativeText?: string;
  onOpenLibrary: () => void;
  onRemove: () => void;
  onEditAlt?: () => void;
  savingAlt?: boolean;
  editingAlt?: boolean;
  altDraft?: string;
  onAltDraftChange?: (v: string) => void;
  onSaveAlt?: () => void;
  onCancelAlt?: () => void;
}

export function FeaturedImageField({
  imageUrl,
  alternativeText,
  onOpenLibrary,
  onRemove,
  onEditAlt,
  savingAlt,
  editingAlt,
  altDraft,
  onAltDraftChange,
  onSaveAlt,
  onCancelAlt,
  imageId,
}: FeaturedImageFieldProps) {
  const src = imageUrl ? getStrapiMediaUrl(imageUrl) ?? imageUrl : null;
  const canEditAlt = Boolean(imageId && onEditAlt);

  return (
    <div className="space-y-3">
      {src ? (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
          <button
            type="button"
            onClick={onOpenLibrary}
            className="relative block aspect-[16/10] max-h-44 w-full"
          >
            <Image src={src} alt={alternativeText ?? ''} fill className="object-cover" unoptimized />
          </button>

          {(editingAlt || alternativeText) && (
            <div className="border-t border-border px-3 py-2">
              {editingAlt ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Texte alternatif (accessibilité)
                  </label>
                  <input
                    value={altDraft ?? ''}
                    onChange={(e) => onAltDraftChange?.(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    placeholder="Décrivez brièvement l'image"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onCancelAlt}
                      className="h-9 flex-1 rounded-lg border border-border text-xs font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={savingAlt}
                      onClick={onSaveAlt}
                      className="h-9 flex-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {savingAlt ? '…' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {alternativeText || 'Sans texte alternatif'}
                </p>
              )}
            </div>
          )}

          <div
            className={cn(
              'grid gap-1 border-t border-border p-1',
              canEditAlt ? 'grid-cols-3' : 'grid-cols-2'
            )}
          >
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-semibold active:bg-muted"
            >
              <FolderOpen className="h-4 w-4" />
              Remplacer
            </button>
            {canEditAlt && (
              <button
                type="button"
                onClick={onEditAlt}
                className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-semibold active:bg-muted"
              >
                <Pencil className="h-4 w-4" />
                Éditer
              </button>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-semibold text-red-600 active:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Retirer
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenLibrary}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-8 active:bg-muted/50"
          >
            <FolderOpen className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-semibold">Bibliothèque</span>
          </button>
          <button
            type="button"
            onClick={onOpenLibrary}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-8 active:bg-muted/50"
          >
            <ImageIcon className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-semibold">Importer</span>
          </button>
        </div>
      )}

      {savingAlt && !editingAlt && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Enregistrement…
        </p>
      )}
    </div>
  );
}
