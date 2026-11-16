'use client';

import { useState } from 'react';
import { Image, ExternalLink } from 'lucide-react';
import { MediaLibrarySheet } from '@/components/redaction/media-library-sheet';
import type { RedactionMediaItem } from '@/lib/redaction/types';
import { getStrapiMediaUrl } from '@/lib/utils';

export function RhMediaLibrary() {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<RedactionMediaItem | null>(null);
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"><Image className="h-5 w-5" /></span>
      <div><h2 className="font-semibold">Médias déjà téléversés</h2><p className="mt-1 text-sm text-muted-foreground">Parcourez les images de la médiathèque de la rédaction. La sélection d’un visuel RH existant évite de le téléverser de nouveau dans le CMS.</p></div>
    </div>
    {selected && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={getStrapiMediaUrl(selected.previewUrl ?? selected.url) ?? selected.url} alt={selected.alternativeText ?? selected.name} className="h-16 w-16 rounded-lg object-cover" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{selected.name}</p><p className="truncate text-xs text-muted-foreground">Média #{selected.id}</p></div>
      <a href={getStrapiMediaUrl(selected.url) ?? selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline">Ouvrir <ExternalLink className="h-3.5 w-3.5" /></a>
    </div>}
    <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{selected ? 'Choisir un autre média' : 'Ouvrir la bibliothèque'}</button>
    <p className="text-xs leading-5 text-muted-foreground">La bibliothèque contient les images partagées du CMS, pas les documents privés (contrats, attestations ou pièces RH). Ceux-ci restent dans le stockage confidentiel.</p>
    <MediaLibrarySheet open={open} onClose={() => setOpen(false)} onSelect={setSelected} title="Bibliothèque des médias RH" apiBase="/api/redaction/rh/medias" browseOnly />
  </section>;
}
