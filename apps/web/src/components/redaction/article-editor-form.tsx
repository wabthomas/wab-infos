'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { CalendarClock, Camera, ChevronDown, Loader2, SlidersHorizontal, Zap } from 'lucide-react';
import type { RedactionCategory } from '@/lib/redaction/types';
import { cn, getStrapiMediaUrl } from '@/lib/utils';

export interface ArticleEditorValues {
  title: string;
  excerpt: string;
  content: string;
  categoryDocumentId: string;
  featuredImageId?: number | null;
  featuredImageUrl?: string;
  isBreaking: boolean;
  scheduledAt?: string;
}

function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hasOptionalFields(initial?: Partial<ArticleEditorValues>): boolean {
  if (!initial) return false;
  return Boolean(
    initial.excerpt?.trim() ||
      initial.featuredImageUrl ||
      initial.isBreaking ||
      initial.scheduledAt
  );
}

interface ArticleEditorFormProps {
  initial?: Partial<ArticleEditorValues>;
  documentId?: string;
  onSuccess?: (documentId: string) => void;
}

export function ArticleEditorForm({ initial, documentId, onSuccess }: ArticleEditorFormProps) {
  const [categories, setCategories] = useState<RedactionCategory[]>([]);
  const [values, setValues] = useState<ArticleEditorValues>({
    title: initial?.title ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    categoryDocumentId: initial?.categoryDocumentId ?? '',
    featuredImageId: initial?.featuredImageId,
    featuredImageUrl: initial?.featuredImageUrl,
    isBreaking: initial?.isBreaking ?? false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'schedule' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(initial?.scheduledAt));
  const [optionsOpen, setOptionsOpen] = useState(hasOptionalFields(initial));

  useEffect(() => {
    fetch('/api/redaction/categories')
      .then((r) => r.json())
      .then((d: { categories?: RedactionCategory[] }) => {
        setCategories(d.categories ?? []);
        if (!values.categoryDocumentId && d.categories?.[0]) {
          setValues((v) => ({ ...v, categoryDocumentId: d.categories![0].documentId }));
        }
      })
      .catch(() => setError('Impossible de charger les rubriques'));
  }, [values.categoryDocumentId]);

  const stripHtmlForEdit = useCallback((html: string) => {
    return html
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }, []);

  useEffect(() => {
    if (initial?.content && initial.content.includes('<')) {
      setValues((v) => ({ ...v, content: stripHtmlForEdit(initial.content!) }));
    }
  }, [initial?.content, stripHtmlForEdit]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/redaction/upload', { method: 'POST', body: form });
      const data = (await res.json()) as { media?: { id: number; url: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload échoué');
      setValues((v) => ({
        ...v,
        featuredImageId: data.media!.id,
        featuredImageUrl: data.media!.url,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload échoué');
    } finally {
      setUploading(false);
    }
  }

  async function save(mode: 'draft' | 'publish' | 'schedule') {
    setError('');
    setSaving(mode);

    const payload = {
      title: values.title,
      excerpt: values.excerpt,
      content: values.content,
      categoryDocumentId: values.categoryDocumentId,
      featuredImageId: values.featuredImageId ?? null,
      isBreaking: values.isBreaking,
      publish: mode === 'publish',
      scheduledAt:
        mode === 'schedule' && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
    };

    try {
      const url = documentId
        ? `/api/redaction/articles/${documentId}`
        : '/api/redaction/articles';
      const res = await fetch(url, {
        method: documentId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { article?: { documentId: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible');
      onSuccess?.(data.article!.documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(null);
    }
  }

  const optionsActive =
    Boolean(values.excerpt.trim()) ||
    Boolean(values.featuredImageUrl) ||
    values.isBreaking ||
    Boolean(scheduledAt);

  return (
    <>
      <div className="space-y-4 pb-24">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="block space-y-1">
          <span className="sr-only">Titre</span>
          <input
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base font-semibold outline-none focus:border-primary"
            placeholder="Titre"
          />
        </label>

        <label className="block space-y-1">
          <span className="sr-only">Contenu</span>
          <textarea
            value={values.content}
            onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
            rows={16}
            className="min-h-[52dvh] w-full rounded-lg border border-border bg-card px-3 py-3 text-base leading-relaxed outline-none focus:border-primary"
            placeholder="Rédigez votre article…"
          />
        </label>

        <div className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setOptionsOpen((open) => !open)}
            className="flex w-full items-center gap-3 px-3 py-3.5 text-left"
            aria-expanded={optionsOpen}
          >
            {values.featuredImageUrl ? (
              <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={getStrapiMediaUrl(values.featuredImageUrl) ?? values.featuredImageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </span>
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Chapô, photo & réglages</span>
              <span className="block truncate text-xs text-muted-foreground">
                {optionsActive
                  ? [
                      values.excerpt.trim() && 'Chapô',
                      values.featuredImageUrl && 'Photo',
                      values.isBreaking && 'Flash',
                      scheduledAt && 'Planifié',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Extrait, image, rubrique, flash…'}
              </span>
            </span>
            {optionsActive && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                actif
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                optionsOpen && 'rotate-180'
              )}
            />
          </button>

          {optionsOpen && (
            <div className="space-y-4 border-t border-border px-3 pb-4 pt-3">
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Photo à la une
                </h3>
                <div className="relative overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
                  {values.featuredImageUrl ? (
                    <div className="relative aspect-[16/10] max-h-40">
                      <Image
                        src={getStrapiMediaUrl(values.featuredImageUrl) ?? values.featuredImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/10] max-h-32 flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6" />
                      )}
                      <span className="text-xs">Ajouter une photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={uploading}
                    aria-label="Ajouter une photo à la une"
                  />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Chapô / extrait
                </h3>
                <textarea
                  value={values.excerpt}
                  onChange={(e) => setValues((v) => ({ ...v, excerpt: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Résumé court affiché sur le site (1–2 phrases)"
                />
                <p className="text-right text-[11px] text-muted-foreground">
                  {values.excerpt.length}/500
                </p>
              </section>

              <section className="space-y-3 border-t border-border pt-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Publication
                </h3>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Rubrique</span>
                  <select
                    value={values.categoryDocumentId}
                    onChange={(e) => setValues((v) => ({ ...v, categoryDocumentId: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    {categories.map((c) => (
                      <option key={c.documentId} value={c.documentId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, isBreaking: !v.isBreaking }))}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors',
                    values.isBreaking
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  )}
                >
                  <Zap className="h-4 w-4" />
                  {values.isBreaking ? 'Flash info activé' : 'Marquer en flash info'}
                </button>

                <label className="block space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Publication planifiée
                  </span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={toDatetimeLocal(new Date().toISOString())}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div
          className={cn(
            'mx-auto grid max-w-lg gap-2',
            scheduledAt ? 'grid-cols-3' : 'grid-cols-2'
          )}
        >
          <button
            type="button"
            disabled={!!saving}
            onClick={() => save('draft')}
            className="h-11 rounded-lg border border-border bg-card text-sm font-semibold disabled:opacity-60"
          >
            {saving === 'draft' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Brouillon'}
          </button>
          {scheduledAt && (
            <button
              type="button"
              disabled={!!saving}
              onClick={() => save('schedule')}
              className="h-11 rounded-lg border border-primary bg-primary/10 text-sm font-semibold text-primary disabled:opacity-60"
            >
              {saving === 'schedule' ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                'Planifier'
              )}
            </button>
          )}
          <button
            type="button"
            disabled={!!saving}
            onClick={() => save('publish')}
            className="h-11 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving === 'publish' ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              'Publier'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
