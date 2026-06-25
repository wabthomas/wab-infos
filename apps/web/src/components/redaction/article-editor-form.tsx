'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  MoreVertical,
  Redo2,
  Settings2,
  Undo2,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import type { RedactionCategory, RedactionMediaItem } from '@/lib/redaction/types';
import type { ArticleEditorPayload } from '@/lib/redaction/types';
import { excerptFromContent, formatArticleContent, generateSeoDescription, generateSeoTitle, getStrapiMediaUrl, stripHtml } from '@/lib/utils';
import {
  clearArticleDraft,
  loadArticleDraft,
  saveArticleDraft,
} from '@/lib/redaction/article-draft-storage';
import { touchRedactionSession } from '@/lib/redaction/touch-session';
import { ArticleRichEditor } from '@/components/redaction/article-rich-editor';
import { ArticleEditorSettingsSheet } from '@/components/redaction/article-editor-settings-sheet';
import { MediaLibrarySheet } from '@/components/redaction/media-library-sheet';

export interface ArticleEditorValues {
  title: string;
  excerpt: string;
  content: string;
  categoryDocumentIds: string[];
  tagNames: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  featuredImageId?: number | null;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
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

function createSnapshot(values: ArticleEditorValues, scheduledAt: string): string {
  return JSON.stringify({ values, scheduledAt });
}

function buildSavePayload(
  values: ArticleEditorValues,
  scheduledAt: string,
  mode: 'draft' | 'publish' | 'schedule'
): ArticleEditorPayload | null {
  const excerpt = values.excerpt.trim() || excerptFromContent(values.content, 170);
  const hasContent = Boolean(stripHtml(values.content));

  if (!values.title.trim() || !hasContent || !values.categoryDocumentIds.length) {
    return null;
  }

  const payload: ArticleEditorPayload = {
    title: values.title,
    excerpt,
    content: values.content,
    categoryDocumentIds: values.categoryDocumentIds,
    featuredImageId: values.featuredImageId ?? null,
    isBreaking: values.isBreaking,
    publish: mode === 'publish',
    scheduledAt:
      mode === 'schedule' && scheduledAt
        ? new Date(scheduledAt).toISOString()
        : null,
  };

  if (values.tagNames.length) payload.tagNames = values.tagNames;

  const seoTitle = values.seoTitle?.trim();
  if (seoTitle) payload.seoTitle = seoTitle;

  const seoDescription = values.seoDescription?.trim();
  if (seoDescription) payload.seoDescription = seoDescription;

  const canonicalUrl = values.canonicalUrl?.trim();
  if (canonicalUrl) payload.canonicalUrl = canonicalUrl;

  return payload;
}

interface ArticleEditorFormProps {
  initial?: Partial<ArticleEditorValues>;
  documentId?: string;
  onSuccess?: (documentId: string, mode: 'draft' | 'publish' | 'schedule') => void;
}

export function ArticleEditorForm({ initial, documentId, onSuccess }: ArticleEditorFormProps) {
  const [categories, setCategories] = useState<RedactionCategory[]>([]);
  const excerptTouchedRef = useRef(Boolean(initial?.excerpt?.trim()));
  const seoTitleTouchedRef = useRef(Boolean(initial?.seoTitle?.trim()));
  const seoDescriptionTouchedRef = useRef(Boolean(initial?.seoDescription?.trim()));
  const lastSavedSnapshot = useRef<string | null>(null);
  const autosaveInFlight = useRef(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState(documentId);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [values, setValues] = useState<ArticleEditorValues>({
    title: initial?.title ?? '',
    excerpt: initial?.excerpt ?? '',
    content: toEditorContent(initial?.content),
    categoryDocumentIds: initial?.categoryDocumentIds ?? [],
    tagNames: initial?.tagNames ?? [],
    seoTitle: initial?.seoTitle ?? '',
    seoDescription: initial?.seoDescription ?? '',
    canonicalUrl: initial?.canonicalUrl ?? '',
    featuredImageId: initial?.featuredImageId,
    featuredImageUrl: initial?.featuredImageUrl,
    featuredImageAlt: initial?.featuredImageAlt ?? '',
    isBreaking: initial?.isBreaking ?? false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'schedule' | null>(null);
  const [savingFeaturedAlt, setSavingFeaturedAlt] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(initial?.scheduledAt));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [editingFeaturedAlt, setEditingFeaturedAlt] = useState(false);
  const [featuredAltDraft, setFeaturedAltDraft] = useState(initial?.featuredImageAlt ?? '');

  useEffect(() => {
    setActiveDocumentId(documentId);
  }, [documentId]);

  useEffect(() => {
    if (documentId || initial?.title?.trim() || initial?.content?.trim()) return;
    const stored = loadArticleDraft();
    if (!stored?.values) return;

    setValues((current) => ({
      ...current,
      title: stored.values.title ?? current.title,
      excerpt: stored.values.excerpt ?? current.excerpt,
      content: toEditorContent(stored.values.content ?? current.content),
      categoryDocumentIds: stored.values.categoryDocumentIds ?? current.categoryDocumentIds,
      tagNames: stored.values.tagNames ?? current.tagNames,
      seoTitle: stored.values.seoTitle ?? current.seoTitle,
      seoDescription: stored.values.seoDescription ?? current.seoDescription,
      canonicalUrl: stored.values.canonicalUrl ?? current.canonicalUrl,
      featuredImageId: stored.values.featuredImageId ?? current.featuredImageId,
      featuredImageUrl: stored.values.featuredImageUrl ?? current.featuredImageUrl,
      featuredImageAlt: stored.values.featuredImageAlt ?? current.featuredImageAlt,
      isBreaking: stored.values.isBreaking ?? current.isBreaking,
    }));
    if (stored.scheduledAt) setScheduledAt(stored.scheduledAt);
  }, [documentId, initial?.title, initial?.content]);

  useEffect(() => {
    void touchRedactionSession();
    const interval = window.setInterval(() => void touchRedactionSession(), 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void touchRedactionSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      lastSavedSnapshot.current = createSnapshot(values, scheduledAt);
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch('/api/redaction/categories')
      .then((r) => r.json())
      .then((d: { categories?: RedactionCategory[] }) => {
        setCategories(d.categories ?? []);
        if (!values.categoryDocumentIds.length && d.categories?.[0]) {
          setValues((v) => ({ ...v, categoryDocumentIds: [d.categories![0].documentId] }));
        }
      })
      .catch(() => setError('Impossible de charger les rubriques'));
  }, [values.categoryDocumentIds.length]);

  const primaryCategoryId = values.categoryDocumentIds[0] ?? '';
  const primaryCategoryName =
    categories.find((c) => c.documentId === primaryCategoryId)?.name ?? 'Rubrique';

  function applyDerivedFields(next: ArticleEditorValues): ArticleEditorValues {
    const result = { ...next };
    if (!excerptTouchedRef.current) {
      result.excerpt = excerptFromContent(next.content, 170);
    }
    if (!seoTitleTouchedRef.current) {
      result.seoTitle = generateSeoTitle(next.title, next.content);
    }
    if (!seoDescriptionTouchedRef.current) {
      result.seoDescription = generateSeoDescription(next.content);
    }
    return result;
  }

  const performAutosave = useCallback(async () => {
    if (saving || autosaveInFlight.current) return;

    const snapshot = createSnapshot(values, scheduledAt);
    if (snapshot === lastSavedSnapshot.current) return;

    const payload = buildSavePayload(values, scheduledAt, 'draft');
    if (!payload) return;

    autosaveInFlight.current = true;
    setAutosaveStatus('saving');

    try {
      const id = activeDocumentId;
      const url = id ? `/api/redaction/articles/${id}` : '/api/redaction/articles';
      const res = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { article?: { documentId: string }; error?: string };
      if (!res.ok || !data.article?.documentId) {
        throw new Error(data.error ?? 'Sauvegarde automatique impossible');
      }

      const savedId = data.article.documentId;
      lastSavedSnapshot.current = snapshot;
      clearArticleDraft(id);
      clearArticleDraft(savedId);

      if (!id) {
        setActiveDocumentId(savedId);
        window.history.replaceState(null, '', `/redaction/articles/${savedId}/edit`);
      }

      void touchRedactionSession();
      setAutosaveStatus('saved');
      window.setTimeout(() => setAutosaveStatus('idle'), 3000);
    } catch {
      setAutosaveStatus('error');
    } finally {
      autosaveInFlight.current = false;
    }
  }, [activeDocumentId, saving, scheduledAt, values]);

  useEffect(() => {
    const snapshot = createSnapshot(values, scheduledAt);
    if (lastSavedSnapshot.current !== null && snapshot === lastSavedSnapshot.current) return;

    const localTimer = window.setTimeout(() => {
      saveArticleDraft(values, scheduledAt, activeDocumentId);
    }, 2000);

    const serverTimer = window.setTimeout(() => {
      void performAutosave();
    }, 20000);

    return () => {
      window.clearTimeout(localTimer);
      window.clearTimeout(serverTimer);
    };
  }, [values, scheduledAt, activeDocumentId, performAutosave]);

  function toggleCategory(categoryId: string) {
    setValues((current) => {
      const exists = current.categoryDocumentIds.includes(categoryId);
      if (exists) {
        const next = current.categoryDocumentIds.filter((id) => id !== categoryId);
        return {
          ...current,
          categoryDocumentIds: next.length ? next : [categoryId],
        };
      }
      return {
        ...current,
        categoryDocumentIds: [...current.categoryDocumentIds, categoryId],
      };
    });
  }

  function selectFeaturedImage(media: RedactionMediaItem) {
    setValues((v) => ({
      ...v,
      featuredImageId: media.id,
      featuredImageUrl: media.url,
      featuredImageAlt: media.alternativeText ?? '',
    }));
    setFeaturedAltDraft(media.alternativeText ?? '');
    setEditingFeaturedAlt(false);
  }

  function removeFeaturedImage() {
    setValues((v) => ({
      ...v,
      featuredImageId: null,
      featuredImageUrl: undefined,
      featuredImageAlt: '',
    }));
    setFeaturedAltDraft('');
    setEditingFeaturedAlt(false);
  }

  async function saveFeaturedAlt() {
    if (!values.featuredImageId) return;
    setSavingFeaturedAlt(true);
    setError('');
    try {
      const res = await fetch(`/api/redaction/media/${values.featuredImageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alternativeText: featuredAltDraft.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Mise à jour impossible');
      setValues((v) => ({ ...v, featuredImageAlt: featuredAltDraft.trim() }));
      setEditingFeaturedAlt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSavingFeaturedAlt(false);
    }
  }

  async function save(mode: 'draft' | 'publish' | 'schedule') {
    setError('');
    setSaving(mode);
    setMenuOpen(false);

    const payload = buildSavePayload(values, scheduledAt, mode);
    if (!payload) {
      setError('Titre, contenu et rubrique requis');
      setSaving(null);
      return;
    }

    try {
      const id = activeDocumentId;
      const url = id ? `/api/redaction/articles/${id}` : '/api/redaction/articles';
      const res = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { article?: { documentId: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible');

      const savedId = data.article!.documentId;
      lastSavedSnapshot.current = createSnapshot(values, scheduledAt);
      clearArticleDraft(id);
      clearArticleDraft(savedId);
      void touchRedactionSession();

      if (!id && mode === 'draft') {
        setActiveDocumentId(savedId);
        window.history.replaceState(null, '', `/redaction/articles/${savedId}/edit`);
      }

      onSuccess?.(savedId, mode);
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
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted disabled:opacity-30"
            aria-label="Annuler"
          >
            <Undo2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted disabled:opacity-30"
            aria-label="Rétablir"
          >
            <Redo2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="min-w-0 flex-1 truncate rounded-full bg-muted/80 px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground active:bg-muted"
          >
            {primaryCategoryName}
            {values.categoryDocumentIds.length > 1 && (
              <span className="ml-1.5">+{values.categoryDocumentIds.length - 1}</span>
            )}
            {values.isBreaking && (
              <span className="ml-1.5 text-red-600">· Flash</span>
            )}
            {scheduledAt && (
              <span className="ml-1.5 text-primary">· Planifié</span>
            )}
            {autosaveStatus === 'saving' && (
              <span className="ml-1.5 text-muted-foreground">· …</span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="ml-1.5 text-green-600">· Sauvé</span>
            )}
            {autosaveStatus === 'error' && (
              <span className="ml-1.5 text-amber-600">· Hors ligne</span>
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

          {values.featuredImageUrl ? (
            <button
              type="button"
              onClick={() => setMediaLibraryOpen(true)}
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border"
              aria-label="Photo à la une"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getStrapiMediaUrl(values.featuredImageUrl) ?? values.featuredImageUrl}
                alt={values.featuredImageAlt ?? ''}
                className="h-full w-full object-cover"
              />
            </button>
          ) : null}

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
              onChange={(e) =>
                setValues((v) => applyDerivedFields({ ...v, title: e.target.value }))
              }
              className="jetpack-editor-title w-full border-0 bg-transparent font-display text-[1.65rem] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50"
              placeholder="Titre"
            />
          </label>

          <div className="mt-3">
            <ArticleRichEditor
              value={values.content}
              onChange={(content) => setValues((v) => applyDerivedFields({ ...v, content }))}
              onEditorReady={setEditor}
            />
          </div>
        </div>
      </div>

      <ArticleEditorSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        categories={categories}
        selectedCategoryIds={values.categoryDocumentIds}
        onToggleCategory={toggleCategory}
        excerpt={values.excerpt}
        onExcerptChange={(excerpt) => {
          excerptTouchedRef.current = true;
          setValues((v) => ({ ...v, excerpt }));
        }}
        tagNames={values.tagNames}
        onTagNamesChange={(tagNames) => setValues((v) => ({ ...v, tagNames }))}
        seoTitle={values.seoTitle ?? ''}
        onSeoTitleChange={(seoTitle) => {
          seoTitleTouchedRef.current = true;
          setValues((v) => ({ ...v, seoTitle }));
        }}
        seoDescription={values.seoDescription ?? ''}
        onSeoDescriptionChange={(seoDescription) => {
          seoDescriptionTouchedRef.current = true;
          setValues((v) => ({ ...v, seoDescription }));
        }}
        canonicalUrl={values.canonicalUrl ?? ''}
        onCanonicalUrlChange={(canonicalUrl) => setValues((v) => ({ ...v, canonicalUrl }))}
        featuredImageId={values.featuredImageId}
        featuredImageUrl={values.featuredImageUrl}
        featuredImageAlt={values.featuredImageAlt}
        onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
        onRemoveFeaturedImage={removeFeaturedImage}
        onEditFeaturedAlt={() => {
          setFeaturedAltDraft(values.featuredImageAlt ?? '');
          setEditingFeaturedAlt(true);
        }}
        savingFeaturedAlt={savingFeaturedAlt}
        editingFeaturedAlt={editingFeaturedAlt}
        featuredAltDraft={featuredAltDraft}
        onFeaturedAltDraftChange={setFeaturedAltDraft}
        onSaveFeaturedAlt={() => void saveFeaturedAlt()}
        onCancelFeaturedAlt={() => {
          setFeaturedAltDraft(values.featuredImageAlt ?? '');
          setEditingFeaturedAlt(false);
        }}
        isBreaking={values.isBreaking}
        onBreakingChange={(isBreaking) => setValues((v) => ({ ...v, isBreaking }))}
        scheduledAt={scheduledAt}
        onScheduledAtChange={setScheduledAt}
        minScheduleDate={toDatetimeLocal(new Date().toISOString())}
      />

      <MediaLibrarySheet
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={selectFeaturedImage}
        title="Photo à la une"
      />
    </div>
  );
}
