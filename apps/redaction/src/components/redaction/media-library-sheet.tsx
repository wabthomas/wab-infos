'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FolderOpen, ImagePlus, Loader2, Search, Upload, X } from 'lucide-react';
import type { RedactionMediaItem } from '@/lib/redaction/types';
import { cn, getStrapiMediaUrl } from '@/lib/utils';

type LibraryTab = 'library' | 'upload';

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
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, RedactionMediaItem[]>>(new Map());

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [open, search]);

  const loadPage = useCallback(async (targetPage: number, append: boolean, query: string) => {
    const cacheKey = `${query}|${targetPage}`;
    const cached = cacheRef.current.get(cacheKey);

    if (targetPage === 1 && !append) {
      if (cached?.length) {
        setItems(cached);
        setPage(1);
        setLoading(false);
      } else {
        setLoading(true);
      }
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
      const data = (await res.json()) as {
        items?: RedactionMediaItem[];
        pageCount?: number;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? 'Chargement impossible');

      const nextItems = data.items ?? [];
      cacheRef.current.set(cacheKey, nextItems);
      setPage(targetPage);
      setPageCount(data.pageCount ?? 1);
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
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/redaction/upload', { method: 'POST', body: form });
      const data = (await res.json()) as {
        media?: { id: number; url: string; name?: string };
        error?: string;
      };
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadFile(file);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      <header className="border-b border-border px-4 py-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-lg items-center gap-2">
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

        <div className="mx-auto mt-3 flex max-w-lg gap-2">
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
        <div className="mx-auto mt-3 w-full max-w-lg px-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        </div>
      )}

      {tab === 'library' ? (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden px-4 py-3">
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
          ) : (
            <div className="flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((item) => {
                  const src = mediaPreviewSrc(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-muted ring-offset-2 active:ring-2 active:ring-primary"
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
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-3 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
            Les images importées sont enregistrées sur le serveur et réutilisables pour d&apos;autres
            articles.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
}
