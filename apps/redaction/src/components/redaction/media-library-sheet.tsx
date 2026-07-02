'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Copy, FolderOpen, ImagePlus, Loader2, Search, Trash2, Upload, X } from 'lucide-react';
import type { RedactionMediaItem } from '@/lib/redaction/types';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { compressClientImage } from '@/lib/redaction/compress-client-image';
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/redaction/image-upload-accept';
import {
  countDeletableDuplicates,
  isDeletableDuplicate,
} from '@/lib/redaction/media-fingerprint';
import { cn, getStrapiMediaUrl } from '@/lib/utils';

type LibraryTab = 'library' | 'upload';

interface MediaPageCache {
  items: RedactionMediaItem[];
  pageCount: number;
}

interface MediaLibrarySheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: RedactionMediaItem) => void;
  title?: string;
}

function mediaPreviewSrc(item: RedactionMediaItem): string {
  return getStrapiMediaUrl(item.previewUrl ?? item.url) ?? item.previewUrl ?? item.url;
}

export function MediaLibrarySheet({
  open,
  onClose,
  onSelect,
  title = 'Choisir une image',
}: MediaLibrarySheetProps) {
  const [tab, setTab] = useState<LibraryTab>('library');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<RedactionMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, MediaPageCache>>(new Map());

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [open, search]);

  const loadPage = useCallback(async (targetPage: number, append: boolean, query: string) => {
    const cacheKey = `${query}|${targetPage}`;
    const cached = cacheRef.current.get(cacheKey);

    if (targetPage === 1 && !append && cached) {
      setItems(cached.items);
      setPage(1);
      setPageCount(cached.pageCount);
      setLoading(false);
      setError('');
      return;
    }

    if (targetPage === 1 && !append) {
      setLoading(true);
    } else if (targetPage > 1) {
      setLoadingMore(true);
    }

    setError('');

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: '36',
      });
      if (query) params.set('q', query);

      const res = await fetch(`/api/redaction/media?${params}`);
      const data = await readApiJsonResponse<{
        items?: RedactionMediaItem[];
        pageCount?: number;
        error?: string;
      }>(res);

      if (!res.ok) throw new Error(data.error ?? 'Chargement impossible');

      const nextItems = data.items ?? [];
      const nextPageCount = data.pageCount ?? 1;
      cacheRef.current.set(cacheKey, { items: nextItems, pageCount: nextPageCount });
      setPage(targetPage);
      setPageCount(nextPageCount);
      setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab('library');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    setShowDuplicatesOnly(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadPage(1, false, debouncedSearch);
  }, [open, debouncedSearch, loadPage]);

  useEffect(() => {
    if (!open || tab !== 'library' || loading || loadingMore) return;
    if (page >= pageCount) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadPage(page + 1, true, debouncedSearch);
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [open, tab, loading, loadingMore, page, pageCount, loadPage, debouncedSearch]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError('');
    try {
      const prepared = await compressClientImage(file);
      const form = new FormData();
      form.append('file', prepared);
      const res = await fetch('/api/redaction/upload', { method: 'POST', body: form });
      const data = await readApiJsonResponse<{
        media?: { id: number; url: string; name?: string; mime?: string };
        duplicate?: boolean;
        error?: string;
      }>(res);

      if (res.status === 409 && data.duplicate && data.media) {
        cacheRef.current.clear();
        onSelect({
          id: data.media.id,
          url: data.media.url,
          previewUrl: data.media.url,
          name: data.media.name ?? file.name,
          mime: data.media.mime ?? prepared.type,
        });
        onClose();
        return;
      }

      if (!res.ok || !data.media) throw new Error(data.error ?? 'Upload échoué');

      const media: RedactionMediaItem = {
        id: data.media.id,
        url: data.media.url,
        previewUrl: data.media.url,
        name: data.media.name ?? file.name,
        mime: file.type,
      };
      cacheRef.current.clear();
      onSelect(media);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload échoué');
    } finally {
      setUploading(false);
    }
  }

  async function deleteDuplicate(item: RedactionMediaItem) {
    if (!isDeletableDuplicate(item, items) || deletingId) return;
    const confirmed = window.confirm(
      `Supprimer le doublon « ${item.name || 'Sans nom' } » ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setError('');
    try {
      const res = await fetch(`/api/redaction/media/${item.id}`, { method: 'DELETE' });
      const data = await readApiJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Suppression impossible');
      cacheRef.current.clear();
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setDeletingId(null);
    }
  }

  const duplicateCount = countDeletableDuplicates(items);
  const visibleItems = showDuplicatesOnly
    ? items.filter((item) => isDeletableDuplicate(item, items))
    : items;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadFile(file);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background lg:items-center lg:justify-center lg:bg-black/45 lg:p-8">
      <button
        type="button"
        className="absolute inset-0 hidden lg:block"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background lg:max-h-[85vh] lg:w-full lg:max-w-4xl lg:flex-none lg:rounded-2xl lg:shadow-2xl">
      <header className="border-b border-border px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] lg:pt-3">
        <div className="redaction-editor-width flex items-center gap-2 lg:max-w-none">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="min-w-0 flex-1 truncate font-display text-base font-bold">{title}</h2>
        </div>

        <div className="redaction-editor-width mt-3 flex gap-2 lg:max-w-none">
          <button
            type="button"
            onClick={() => setTab('library')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold',
              tab === 'library' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            )}
          >
            <FolderOpen className="h-4 w-4" />
            Bibliothèque
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold',
              tab === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            )}
          >
            <Upload className="h-4 w-4" />
            Importer
          </button>
        </div>
      </header>

      {error && (
        <div className="redaction-editor-width mt-3 lg:max-w-none">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {tab === 'library' ? (
        <div className="redaction-editor-width flex min-h-0 flex-1 flex-col overflow-hidden py-3 lg:max-w-none">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher sur le serveur…"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-base outline-none focus:border-primary"
            />
          </div>

          {duplicateCount > 0 ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Copy className="h-3.5 w-3.5" />
                {duplicateCount} doublon{duplicateCount > 1 ? 's' : ''} supprimable
                {duplicateCount > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => setShowDuplicatesOnly((value) => !value)}
                className="rounded-lg bg-amber-100 px-2.5 py-1 font-semibold text-amber-900"
              >
                {showDuplicatesOnly ? 'Tout afficher' : 'Voir les doublons'}
              </button>
            </div>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ImagePlus className="h-10 w-10 opacity-50" />
              <p className="text-sm">Aucune image trouvée</p>
              <button
                type="button"
                onClick={() => setTab('upload')}
                className="text-sm font-semibold text-primary"
              >
                Importer une image
              </button>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Copy className="h-10 w-10 opacity-50" />
              <p className="text-sm">Aucun doublon dans la liste chargée.</p>
              <button
                type="button"
                onClick={() => setShowDuplicatesOnly(false)}
                className="text-sm font-semibold text-primary"
              >
                Afficher toute la bibliothèque
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {visibleItems.map((item) => {
                  const src = mediaPreviewSrc(item);
                  const deletable = isDeletableDuplicate(item, items);
                  return (
                    <div key={item.id} className="group relative aspect-square">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className="h-full w-full overflow-hidden rounded-xl bg-muted ring-offset-2 active:ring-2 active:ring-primary"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={item.alternativeText ?? item.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform group-active:scale-105"
                        />
                      </button>
                      {deletable ? (
                        <>
                          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow">
                            Doublon
                          </span>
                          <button
                            type="button"
                            aria-label={`Supprimer le doublon ${item.name}`}
                            disabled={deletingId === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteDuplicate(item);
                            }}
                            className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-md disabled:opacity-60"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {page < pageCount && (
                <div
                  ref={loadMoreRef}
                  className="mt-4 flex h-11 w-full items-center justify-center"
                  aria-hidden
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="redaction-editor-width flex flex-1 flex-col justify-center gap-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-w-md lg:mx-auto">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <FolderOpen className="h-5 w-5" />
                Choisir un fichier
              </>
            )}
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraRef.current?.click()}
            className="flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-60"
          >
            <Camera className="h-5 w-5" />
            Prendre une photo
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Les images déjà présentes sur le serveur ne sont pas réimportées. Les doublons
            existants peuvent être supprimés depuis l&apos;onglet Bibliothèque.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
      </div>
    </div>
  );
}
