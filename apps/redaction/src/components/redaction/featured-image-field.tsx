'use client';

import Image from 'next/image';
import { FolderOpen, ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { getStrapiMediaUrl } from '@/lib/utils';

interface FeaturedImageFieldProps {
  imageId?: number | null;
  imageUrl?: string;
  alternativeText?: string;
  onOpenLibrary: () => void;
  onRemove: () => void;
  savingAlt?: boolean;
  altDraft: string;
  onAltDraftChange: (v: string) => void;
  onSaveAlt: () => void;
}

export function FeaturedImageField({
  imageUrl,
  alternativeText,
  onOpenLibrary,
  onRemove,
  savingAlt,
  altDraft,
  onAltDraftChange,
  onSaveAlt,
  imageId,
}: FeaturedImageFieldProps) {
  const src = imageUrl ? getStrapiMediaUrl(imageUrl) ?? imageUrl : null;
  const canEditAlt = Boolean(imageId);
  const dirty = altDraft.trim() !== (alternativeText ?? '').trim();

  return (
    <div className="space-y-3">
      {src ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <button
            type="button"
            onClick={onOpenLibrary}
            className="relative block aspect-[16/10] max-h-52 w-full bg-muted"
          >
            <Image src={src} alt={alternativeText ?? ''} fill className="object-cover" unoptimized />
          </button>

          <div className="space-y-3 border-t border-border bg-gradient-to-b from-muted/40 to-card px-3 py-3">
            <label className="block space-y-1.5">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Texte alternatif
                </span>
                <span className="text-[10px] text-muted-foreground">Accessibilité / SEO</span>
              </span>
              <input
                value={altDraft}
                onChange={(e) => onAltDraftChange(e.target.value)}
                disabled={!canEditAlt}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                placeholder="Décrivez brièvement ce que montre l’image"
              />
            </label>

            {canEditAlt ? (
              <button
                type="button"
                disabled={savingAlt || !dirty}
                onClick={onSaveAlt}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {savingAlt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {savingAlt ? 'Enregistrement…' : dirty ? 'Enregistrer le texte alt' : 'À jour'}
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-1 border-t border-border p-1">
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold active:bg-muted"
            >
              <FolderOpen className="h-4 w-4" />
              Remplacer
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-red-600 active:bg-red-500/10"
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
    </div>
  );
}
