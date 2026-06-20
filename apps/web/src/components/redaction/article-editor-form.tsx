'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Camera, Loader2, Zap } from 'lucide-react';
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
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [uploading, setUploading] = useState(false);

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

  async function save(publish: boolean) {
    setError('');
    setSaving(publish ? 'publish' : 'draft');

    const payload = {
      title: values.title,
      excerpt: values.excerpt,
      content: values.content,
      categoryDocumentId: values.categoryDocumentId,
      featuredImageId: values.featuredImageId ?? null,
      isBreaking: values.isBreaking,
      publish,
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

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Image à la une</span>
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
          {values.featuredImageUrl ? (
            <div className="relative aspect-[16/10]">
              <Image
                src={getStrapiMediaUrl(values.featuredImageUrl) ?? values.featuredImageUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Camera className="h-8 w-8" />
              )}
              <span className="text-sm">Ajouter une photo</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={uploading}
          />
        </div>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Titre</span>
        <input
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          className="h-12 w-full rounded-lg border border-border bg-card px-4 text-base font-semibold outline-none focus:border-primary"
          placeholder="Titre de l'article"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Chapô</span>
        <textarea
          value={values.excerpt}
          onChange={(e) => setValues((v) => ({ ...v, excerpt: e.target.value }))}
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none focus:border-primary"
          placeholder="Résumé en une ou deux phrases"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Contenu</span>
        <textarea
          value={values.content}
          onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
          rows={12}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-base leading-relaxed outline-none focus:border-primary"
          placeholder="Rédigez votre article… (paragraphes séparés par une ligne vide)"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Rubrique</span>
        <select
          value={values.categoryDocumentId}
          onChange={(e) => setValues((v) => ({ ...v, categoryDocumentId: e.target.value }))}
          className="h-12 w-full rounded-lg border border-border bg-card px-4 text-base outline-none focus:border-primary"
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
          'flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
          values.isBreaking
            ? 'border-red-600 bg-red-600 text-white'
            : 'border-border bg-card text-foreground hover:bg-muted'
        )}
      >
        <Zap className="h-4 w-4" />
        {values.isBreaking ? 'Flash info activé' : 'Marquer en flash info'}
      </button>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          disabled={!!saving}
          onClick={() => save(false)}
          className="h-12 rounded-lg border border-border bg-card font-semibold disabled:opacity-60"
        >
          {saving === 'draft' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Brouillon'}
        </button>
        <button
          type="button"
          disabled={!!saving}
          onClick={() => save(true)}
          className="h-12 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving === 'publish' ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            'Publier'
          )}
        </button>
      </div>

      {documentId && (
        <Link
          href="/redaction/articles"
          className="block text-center text-sm text-muted-foreground hover:text-primary"
        >
          Retour à mes articles
        </Link>
      )}
    </div>
  );
}
