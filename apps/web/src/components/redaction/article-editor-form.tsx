'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  MoreVertical,
  Settings2,
} from 'lucide-react';
import type { RedactionCategory } from '@/lib/redaction/types';
import { formatArticleContent, getStrapiMediaUrl } from '@/lib/utils';
import { ArticleRichEditor } from '@/components/redaction/article-rich-editor';
import { ArticleEditorSettingsSheet } from '@/components/redaction/article-editor-settings-sheet';

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

function toEditorContent(raw?: string): string {
  if (!raw?.trim()) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return formatArticleContent(raw);
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
    content: toEditorContent(initial?.content),
    categoryDocumentId: initial?.categoryDocumentId ?? '',
    featuredImageId: initial?.featuredImageId,
    featuredImageUrl: initial?.featuredImageUrl,
    isBreaking: initial?.isBreaking ?? false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'schedule' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(initial?.scheduledAt));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const categoryName =
    categories.find((c) => c.documentId === values.categoryDocumentId)?.name ?? 'Rubrique';

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
    setMenuOpen(false);

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

  const primaryMode =
    scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? 'schedule' : 'publish';

  return (
    <div className="jetpack-editor-screen flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Link
            href="/redaction/articles"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="min-w-0 flex-1 truncate rounded-full bg-muted/80 px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground active:bg-muted"
          >
            {categoryName}
            {values.isBreaking && (
              <span className="ml-1.5 text-red-600">· Flash</span>
            )}
            {scheduledAt && (
              <span className="ml-1.5 text-primary">· Planifié</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted"
            aria-label="Réglages"
          >
            <Settings2 className="h-5 w-5" />
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground active:bg-muted"
              aria-label="Plus d’actions"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Fermer le menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
                  <button
                    type="button"
                    disabled={!!saving}
                    onClick={() => save('draft')}
                    className="flex w-full px-4 py-2.5 text-left text-sm font-medium active:bg-muted disabled:opacity-50"
                  >
                    {saving === 'draft' ? 'Enregistrement…' : 'Enregistrer brouillon'}
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={!!saving}
            onClick={() => save(primaryMode)}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving === primaryMode ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : primaryMode === 'schedule' ? (
              'Planifier'
            ) : (
              'Publier'
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-[calc(3.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg px-4 pt-4">
          <label className="block">
            <span className="sr-only">Titre</span>
            <input
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              className="jetpack-editor-title w-full border-0 bg-transparent font-display text-[1.65rem] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
              placeholder="Titre"
            />
          </label>

          {values.featuredImageUrl && (
            <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getStrapiMediaUrl(values.featuredImageUrl) ?? values.featuredImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="mt-3">
            <ArticleRichEditor
              value={values.content}
              onChange={(content) => setValues((v) => ({ ...v, content }))}
            />
          </div>
        </div>
      </div>

      <ArticleEditorSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        categories={categories}
        excerpt={values.excerpt}
        onExcerptChange={(excerpt) => setValues((v) => ({ ...v, excerpt }))}
        categoryDocumentId={values.categoryDocumentId}
        onCategoryChange={(id) => setValues((v) => ({ ...v, categoryDocumentId: id }))}
        featuredImageUrl={values.featuredImageUrl}
        onFeaturedImageChange={handleImageChange}
        uploading={uploading}
        isBreaking={values.isBreaking}
        onBreakingChange={(isBreaking) => setValues((v) => ({ ...v, isBreaking }))}
        scheduledAt={scheduledAt}
        onScheduledAtChange={setScheduledAt}
        minScheduleDate={toDatetimeLocal(new Date().toISOString())}
      />
    </div>
  );
}
