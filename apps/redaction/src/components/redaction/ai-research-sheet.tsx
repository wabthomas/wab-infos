'use client';

import { useState } from 'react';
import { Loader2, Link2, Sparkles, X } from 'lucide-react';
import { normalizeArticleSeoMeta } from '@wab-infos/shared';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { useToast } from '@/components/ui/toast';

export interface AiResearchResult {
  title: string;
  excerpt: string;
  contentHtml: string;
  focusKeyphrase: string;
  seoTitle: string;
  seoDescription: string;
  categoryDocumentId: string | null;
  featuredImage: { id: number; url: string; alternativeText?: string } | null;
  sourceUrl: string | null;
  provider: string;
  documentId?: string;
}

interface AiResearchSheetProps {
  open: boolean;
  onClose: () => void;
  /** Si false, ne crée pas d’article Strapi — renvoie le brouillon à appliquer. */
  persist?: boolean;
  onResult: (result: AiResearchResult) => void;
}

export function AiResearchSheet({
  open,
  onClose,
  persist = false,
  onResult,
}: AiResearchSheetProps) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function run() {
    if (!url.trim() && !topic.trim()) {
      toast.error('Indiquez un lien ou un sujet');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/redaction/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim() || undefined,
          topic: topic.trim() || undefined,
          persist,
        }),
      });
      const data = await readApiJsonResponse<AiResearchResult & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Rédaction IA impossible');
      if (!data.title?.trim() || !data.contentHtml?.trim()) {
        throw new Error('Brouillon IA incomplet');
      }
      onResult({
        ...data,
        focusKeyphrase: data.focusKeyphrase || '',
        seoTitle: data.seoTitle || data.title,
        seoDescription: data.seoDescription || data.excerpt || '',
        categoryDocumentId: data.categoryDocumentId ?? null,
        featuredImage: data.featuredImage ?? null,
        sourceUrl: data.sourceUrl ?? null,
        provider: data.provider || 'ia',
      });
      setUrl('');
      setTopic('');
      onClose();
      toast.success(
        persist ? 'Brouillon créé' : 'Proposition IA appliquée',
        data.featuredImage ? `${data.title} · photo à la une` : data.title
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rédaction IA impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Fermer"
        onClick={() => (!busy ? onClose() : undefined)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">Assistant IA</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Collez un lien (article, X…) ou un sujet. L’IA rédige un brouillon SEO
                {persist ? '' : ' dans cet éditeur'}
                {persist ? '' : ' et récupère une photo si disponible'}.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Lien source
            </span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://… ou https://x.com/…"
              disabled={busy}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Sujet / consignes (optionnel si lien)
            </span>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ex. : angle Kinshasa, rappeler le contexte sécuritaire…"
              disabled={busy}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-60"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? 'Rédaction…' : 'Rédiger'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Helper pour appliquer un résultat IA aux champs SEO meta. */
export function seoMetaFromAiResearch(result: AiResearchResult) {
  return normalizeArticleSeoMeta({
    focusKeyphrase: result.focusKeyphrase,
    robotsIndex: true,
    robotsFollow: true,
    schemaType: 'NewsArticle',
    ogTitle: result.seoTitle,
    ogDescription: result.seoDescription,
  });
}
