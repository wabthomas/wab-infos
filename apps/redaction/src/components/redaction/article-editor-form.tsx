'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Redo2,
  Undo2,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import type { RedactionCategory, RedactionMediaItem } from '@/lib/redaction/types';
import type { ArticleEditorPayload } from '@/lib/redaction/types';
import { excerptFromContent, formatArticleContent, generateSeoDescription, generateSeoTitle, stripHtml } from '@/lib/utils';
import {
  clearArticleDraft,
  loadArticleDraft,
  saveArticleDraft,
} from '@/lib/redaction/article-draft-storage';
import { touchRedactionSession } from '@/lib/redaction/touch-session';
import { ArticleRichEditor } from '@/components/redaction/article-rich-editor';
import { ArticleEditorSettingsSheet } from '@/components/redaction/article-editor-settings-sheet';
import { ArticleEditorOptionsMenu } from '@/components/redaction/article-editor-options-menu';
import { ArticlePublishSheet } from '@/components/redaction/article-publish-sheet';
import { MediaLibrarySheet } from '@/components/redaction/media-library-sheet';
import type { RedactionAuthor } from '@/lib/redaction/types';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;
const DRAFT_SAVE_HEADERS = { ...JSON_HEADERS, 'X-Redaction-Draft': '1' } as const;

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
  authorDocumentId?: string;
  publishedAt?: string;
  articleStatus?: 'draft' | 'published' | 'scheduled' | 'archived';
  viewCount?: number;
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

function isNetworkSaveError(err: unknown): boolean {
  if (err instanceof TypeError) {
    return err.message === 'Failed to fetch' || err.message.includes('NetworkError');
  }
  return false;
}

function formatSaveError(err: unknown): string {
  if (isNetworkSaveError(err)) {
    return 'Connexion interrompue. Vérifiez votre réseau puis réessayez.';
  }
  if (err instanceof Error) return err.message;
  return 'Erreur';
}

async function recoverPublishAfterNetworkError(
  documentId: string,
  mode: 'publish' | 'schedule'
): Promise<boolean> {
  try {
    const res = await fetch(`/api/redaction/articles/${documentId}`);
    if (!res.ok) return false;
    const data = (await res.json()) as {
      article?: { status?: string; publishedAt?: string; scheduledAt?: string };
    };
    const article = data.article;
    if (!article) return false;
    if (mode === 'publish') {
      return article.status === 'published' || Boolean(article.publishedAt);
    }
    return article.status === 'scheduled' && Boolean(article.scheduledAt);
  } catch {
    return false;
  }
}

function buildSavePayload(
  values: ArticleEditorValues,
  scheduledAt: string,
  mode: 'draft' | 'publish' | 'schedule',
  options?: { partialDraft?: boolean; defaultCategoryId?: string }
): ArticleEditorPayload | null {
  const hasContent = Boolean(stripHtml(values.content));
  const hasTitle = Boolean(values.title.trim());
  const isDraft = mode === 'draft' || options?.partialDraft;

  let categoryIds = values.categoryDocumentIds;
  if (!categoryIds.length && options?.defaultCategoryId) {
    categoryIds = [options.defaultCategoryId];
  }

  if (isDraft) {
    if (!hasTitle && !hasContent) return null;
    if (!categoryIds.length) return null;
  } else if (!hasTitle || !hasContent || !categoryIds.length) {
    return null;
  }

  const content = hasContent ? values.content : '<p></p>';
  const excerpt =
    values.excerpt.trim() ||
    excerptFromContent(content, 170) ||
    (hasTitle ? values.title.trim().slice(0, 170) : 'Brouillon');

  const payload: ArticleEditorPayload = {
    title: hasTitle ? values.title : 'Sans titre',
    excerpt,
    content,
    categoryDocumentIds: categoryIds,
    featuredImageId: values.featuredImageId ?? null,
    isBreaking: values.isBreaking,
    publish: mode === 'publish',
    scheduledAt:
      mode === 'schedule' && scheduledAt
        ? new Date(scheduledAt).toISOString()
        : null,
  };

  if (isDraft) {
    payload.draftOnly = true;
    payload.publish = false;
    payload.scheduledAt = null;
  }

  if (values.tagNames.length) payload.tagNames = values.tagNames;

  const seoTitle = values.seoTitle?.trim();
  if (seoTitle) payload.seoTitle = seoTitle;

  const seoDescription = values.seoDescription?.trim();
  if (seoDescription) payload.seoDescription = seoDescription;

  const canonicalUrl = values.canonicalUrl?.trim();
  if (canonicalUrl) payload.canonicalUrl = canonicalUrl;

  if (mode !== 'draft' && values.authorDocumentId) {
    payload.authorDocumentId = values.authorDocumentId;
  }

  return payload;
}

interface ArticleEditorFormProps {
  initial?: Partial<ArticleEditorValues>;
  documentId?: string;
  onSuccess?: (documentId: string, mode: 'draft' | 'publish' | 'schedule') => void;
}

export function ArticleEditorForm({ initial, documentId, onSuccess }: ArticleEditorFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<RedactionCategory[]>([]);
  const [authors, setAuthors] = useState<RedactionAuthor[]>([]);
  const [canAssignAuthor, setCanAssignAuthor] = useState(false);
  const [canDeleteAny, setCanDeleteAny] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentAuthorName, setCurrentAuthorName] = useState('');
  const excerptTouchedRef = useRef(Boolean(initial?.excerpt?.trim()));
  const seoTitleTouchedRef = useRef(Boolean(initial?.seoTitle?.trim()));
  const seoDescriptionTouchedRef = useRef(Boolean(initial?.seoDescription?.trim()));
  const lastSavedSnapshot = useRef<string | null>(null);
  const autosaveInFlight = useRef(false);
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
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
    authorDocumentId: initial?.authorDocumentId,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'schedule' | null>(null);
  const [publishSheetMode, setPublishSheetMode] = useState<'publish' | 'schedule' | null>(null);
  const [savingFeaturedAlt, setSavingFeaturedAlt] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(initial?.scheduledAt));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [editingFeaturedAlt, setEditingFeaturedAlt] = useState(false);
  const [featuredAltDraft, setFeaturedAltDraft] = useState(initial?.featuredImageAlt ?? '');
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const enqueueSave = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const run = saveChainRef.current.then(operation, operation);
    saveChainRef.current = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }, []);

  const waitForPendingSaves = useCallback(async () => {
    await saveChainRef.current;
  }, []);

  useEffect(() => {
    void fetch('/api/redaction/media?page=1&pageSize=36').catch(() => undefined);
  }, []);

  useEffect(() => {
    void fetch('/api/redaction/auth/me')
      .then((r) => r.json())
      .then(
        (data: {
          author?: RedactionAuthor;
          isSuperAdmin?: boolean;
          canAssignAuthor?: boolean;
          canDeleteAnyArticle?: boolean;
        }) => {
          if (data.author?.name) setCurrentAuthorName(data.author.name);
          if (data.author?.documentId && !initial?.authorDocumentId) {
            setValues((v) => ({
              ...v,
              authorDocumentId: v.authorDocumentId ?? data.author!.documentId,
            }));
          }
          setCanAssignAuthor(Boolean(data.canAssignAuthor ?? data.isSuperAdmin));
          setCanDeleteAny(Boolean(data.canDeleteAnyArticle ?? data.isSuperAdmin));
        }
      )
      .catch(() => undefined);
  }, [initial?.authorDocumentId]);

  useEffect(() => {
    if (!canAssignAuthor) return;
    void fetch('/api/redaction/authors')
      .then((r) => r.json())
      .then((data: { authors?: RedactionAuthor[] }) => {
        if (data.authors?.length) setAuthors(data.authors);
      })
      .catch(() => undefined);
  }, [canAssignAuthor]);

  useEffect(() => {
    document.documentElement.classList.add('redaction-writing');
    return () => document.documentElement.classList.remove('redaction-writing');
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [error]);

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

  const primaryCategoryId = values.categoryDocumentIds[0] ?? categories[0]?.documentId ?? '';
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

  const persistDraft = useCallback(
    async (options?: {
      keepalive?: boolean;
      silent?: boolean;
      manual?: boolean;
    }): Promise<string | null> => {
      if (saving && !options?.manual) {
        return null;
      }

      if (options?.manual) {
        await waitForPendingSaves();
      } else if (autosaveInFlight.current && !options?.keepalive) {
        return null;
      }

      const snapshot = createSnapshot(values, scheduledAt);
      if (snapshot === lastSavedSnapshot.current) return activeDocumentId ?? null;

      const payload = buildSavePayload(values, scheduledAt, 'draft', {
        partialDraft: true,
        defaultCategoryId: primaryCategoryId || categories[0]?.documentId,
      });
      if (!payload) return null;

      if (options?.keepalive) {
        const id = activeDocumentId;
        const url = id ? `/api/redaction/articles/${id}` : '/api/redaction/articles';
        void fetch(url, {
          method: id ? 'PUT' : 'POST',
          headers: DRAFT_SAVE_HEADERS,
          body: JSON.stringify(payload),
          keepalive: true,
        });
        return id ?? null;
      }

      return enqueueSave(async () => {
        const snapshot = createSnapshot(values, scheduledAt);
        if (snapshot === lastSavedSnapshot.current) return activeDocumentId ?? null;

        const currentPayload = buildSavePayload(values, scheduledAt, 'draft', {
          partialDraft: true,
          defaultCategoryId: primaryCategoryId || categories[0]?.documentId,
        });
        if (!currentPayload) return null;

        autosaveInFlight.current = true;
        if (!options?.silent) setAutosaveStatus('saving');

        try {
          const id = activeDocumentId;
          const url = id ? `/api/redaction/articles/${id}` : '/api/redaction/articles';
          const res = await fetch(url, {
            method: id ? 'PUT' : 'POST',
            headers: DRAFT_SAVE_HEADERS,
            body: JSON.stringify(currentPayload),
          });
          const data = (await res.json()) as { article?: { documentId: string }; error?: string };
          if (!res.ok || !data.article?.documentId) {
            throw new Error(data.error ?? 'Sauvegarde impossible');
          }

          const savedId = data.article.documentId;
          lastSavedSnapshot.current = snapshot;
          clearArticleDraft(id);
          clearArticleDraft(savedId);

          if (!id) {
            setActiveDocumentId(savedId);
            window.history.replaceState(null, '', `/articles/${savedId}/edit`);
          }

          void touchRedactionSession();
          if (!options?.silent) {
            setAutosaveStatus('saved');
            window.setTimeout(() => setAutosaveStatus('idle'), 3000);
          }

          return savedId;
        } catch (err) {
          if (!options?.silent) setAutosaveStatus('error');
          if (!options?.silent && options?.manual) {
            throw err;
          }
          return null;
        } finally {
          autosaveInFlight.current = false;
        }
      });
    },
    [activeDocumentId, categories, enqueueSave, primaryCategoryId, saving, scheduledAt, values, waitForPendingSaves]
  );

  const performAutosave = useCallback(async () => {
    await persistDraft();
  }, [persistDraft]);

  useEffect(() => {
    const snapshot = createSnapshot(values, scheduledAt);
    if (lastSavedSnapshot.current !== null && snapshot === lastSavedSnapshot.current) return;

    const localTimer = window.setTimeout(() => {
      saveArticleDraft(values, scheduledAt, activeDocumentId);
    }, 2000);

    const serverTimer = window.setTimeout(() => {
      void performAutosave();
    }, 8000);

    return () => {
      window.clearTimeout(localTimer);
      window.clearTimeout(serverTimer);
    };
  }, [values, scheduledAt, activeDocumentId, performAutosave]);

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState !== 'hidden') return;
      saveArticleDraft(values, scheduledAt, activeDocumentId);
      void persistDraft({ keepalive: true, silent: true });
    };

    const flushOnUnload = () => {
      saveArticleDraft(values, scheduledAt, activeDocumentId);
      void persistDraft({ keepalive: true, silent: true });
    };

    document.addEventListener('visibilitychange', flushOnHide);
    window.addEventListener('pagehide', flushOnUnload);
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide);
      window.removeEventListener('pagehide', flushOnUnload);
    };
  }, [activeDocumentId, persistDraft, scheduledAt, values]);

  async function handleBack() {
    await persistDraft({ silent: true });
    router.push('/articles');
  }

  const isDraftArticle =
    !initial?.publishedAt &&
    (initial?.articleStatus === 'draft' || initial?.articleStatus === undefined);
  const canDeleteArticle =
    Boolean(activeDocumentId) && (canDeleteAny || isDraftArticle);

  async function deleteArticle() {
    if (!activeDocumentId || !canDeleteArticle || deleting) return;
    const label = values.title.trim() || 'Sans titre';
    const confirmed = window.confirm(
      isDraftArticle
        ? `Supprimer le brouillon « ${label} » ? Cette action est irréversible.`
        : `Supprimer définitivement l'article « ${label} » ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setMenuOpen(false);
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/redaction/articles/${activeDocumentId}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Suppression impossible');
      router.push('/articles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setDeleting(false);
    }
  }

  function setPrimaryCategory(categoryId: string) {
    setValues((current) => {
      const rest = current.categoryDocumentIds.filter((id) => id !== categoryId);
      return {
        ...current,
        categoryDocumentIds: [categoryId, ...rest],
      };
    });
  }

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

    if (mode === 'draft') {
      try {
        const savedId = await persistDraft({ manual: true });
        if (!savedId) {
          setError('Ajoutez un titre ou du contenu pour enregistrer le brouillon');
        } else {
          onSuccess?.(savedId, mode);
        }
      } catch (err) {
        setError(formatSaveError(err));
      } finally {
        setSaving(null);
      }
      return;
    }

    const payload = buildSavePayload(values, scheduledAt, mode, {
      defaultCategoryId: primaryCategoryId || categories[0]?.documentId,
    });
    if (!payload) {
      setError('Titre, contenu et rubrique requis');
      setSaving(null);
      return;
    }

    await waitForPendingSaves();

    try {
      const savedId = await enqueueSave(async () => {
        const id = activeDocumentId;
        const url = id ? `/api/redaction/articles/${id}` : '/api/redaction/articles';
        const res = await fetch(url, {
          method: id ? 'PUT' : 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { article?: { documentId: string }; error?: string };
        if (!res.ok || !data.article?.documentId) {
          throw new Error(data.error ?? 'Enregistrement impossible');
        }
        return data.article.documentId;
      });

      lastSavedSnapshot.current = createSnapshot(values, scheduledAt);
      clearArticleDraft(activeDocumentId);
      clearArticleDraft(savedId);
      void touchRedactionSession();

      if (!activeDocumentId) {
        setActiveDocumentId(savedId);
        window.history.replaceState(null, '', `/articles/${savedId}/edit`);
      }

      onSuccess?.(savedId, mode);
    } catch (err) {
      const documentId = activeDocumentId;
      if (documentId && isNetworkSaveError(err)) {
        const recovered = await recoverPublishAfterNetworkError(documentId, mode);
        if (recovered) {
          lastSavedSnapshot.current = createSnapshot(values, scheduledAt);
          onSuccess?.(documentId, mode);
          return;
        }
      }
      setError(formatSaveError(err));
    } finally {
      setSaving(null);
    }
  }

  const primaryMode =
    scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? 'schedule' : 'publish';

  return (
    <div className="jetpack-editor-screen fixed inset-0 flex flex-col bg-background">
      <header
        ref={headerRef}
        className="native-safe-top fixed inset-x-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur pt-2"
      >
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <button
            type="button"
            onClick={() => void handleBack()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

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

          <div className="min-w-0 flex-1" />

          <button
            type="button"
            disabled={!!saving}
            onClick={() => {
              const payload = buildSavePayload(values, scheduledAt, primaryMode);
              if (!payload) {
                setError('Titre, contenu et rubrique requis');
                return;
              }
              setError('');
              setPublishSheetMode(primaryMode);
            }}
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

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingTop: headerHeight,
          paddingBottom: `calc(3.75rem + env(safe-area-inset-bottom) + ${keyboardInset}px)`,
        }}
      >
        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

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

          <div className="mt-2 flex items-center gap-2 border-b border-border/50 pb-3">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {currentAuthorName || 'Rédaction'}
              </span>
              {primaryCategoryName ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span>{primaryCategoryName}</span>
                  {values.categoryDocumentIds.length > 1 ? (
                    <span> +{values.categoryDocumentIds.length - 1}</span>
                  ) : null}
                </>
              ) : null}
              {(initial?.viewCount ?? 0) > 0 ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span>{initial?.viewCount?.toLocaleString('fr-FR')} vues</span>
                </>
              ) : null}
              {values.isBreaking ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="font-semibold text-red-600">Flash</span>
                </>
              ) : null}
              {scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="text-primary">Planifié</span>
                </>
              ) : null}
              {autosaveStatus === 'saving' ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span>Enregistrement…</span>
                </>
              ) : null}
              {autosaveStatus === 'saved' ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="text-green-600">Sauvé</span>
                </>
              ) : null}
              {autosaveStatus === 'error' ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="text-amber-600">Hors ligne</span>
                </>
              ) : null}
            </p>
            <ArticleEditorOptionsMenu
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenFeaturedImage={() => setMediaLibraryOpen(true)}
              onSaveDraft={() => void save('draft')}
              onDelete={() => void deleteArticle()}
              savingDraft={saving === 'draft'}
              deleting={deleting}
              canDelete={canDeleteArticle}
              hasFeaturedImage={Boolean(values.featuredImageUrl)}
            />
          </div>

          <div className="mt-3">
            <ArticleRichEditor
              value={values.content}
              onChange={(content) => setValues((v) => applyDerivedFields({ ...v, content }))}
              onEditorReady={setEditor}
              onKeyboardInsetChange={setKeyboardInset}
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
        onSetPrimaryCategory={setPrimaryCategory}
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

      <ArticlePublishSheet
        open={publishSheetMode !== null}
        mode={publishSheetMode ?? 'publish'}
        saving={saving === publishSheetMode}
        categories={categories}
        primaryCategoryId={primaryCategoryId}
        onPrimaryCategoryChange={setPrimaryCategory}
        canAssignAuthor={canAssignAuthor}
        authors={authors}
        authorDocumentId={values.authorDocumentId ?? ''}
        onAuthorChange={(id) => setValues((v) => ({ ...v, authorDocumentId: id }))}
        currentAuthorName={currentAuthorName}
        scheduledAt={scheduledAt}
        onClose={() => setPublishSheetMode(null)}
        onConfirm={() => {
          if (!publishSheetMode) return;
          void save(publishSheetMode).finally(() => setPublishSheetMode(null));
        }}
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
