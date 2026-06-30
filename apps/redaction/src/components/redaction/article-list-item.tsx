'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, EyeOff, Loader2, Pencil, Share2, Trash2, Upload } from 'lucide-react';
import type { RedactionArticle } from '@/lib/redaction/types';
import { getPublicArticleUrl } from '@/lib/redaction/article-public-url';
import { isLiveRedactionArticle } from '@/lib/redaction/status-label';
import { getRedactionArticleStatusLabel } from '@/lib/redaction/status-label';
import { formatArticleDate, getArticleDisplayDate } from '@/lib/utils';

interface ArticleListItemProps {
  article: RedactionArticle;
  showViews?: boolean;
  showAuthor?: boolean;
  canDeleteAny?: boolean;
  canManagePublication?: boolean;
  onDeleted?: (documentId: string) => void;
  onPublicationChange?: (documentId: string, article: RedactionArticle) => void;
}

export function ArticleListItem({
  article,
  showViews = true,
  showAuthor = false,
  canDeleteAny = false,
  canManagePublication = false,
  onDeleted,
  onPublicationChange,
}: ArticleListItemProps) {
  const publicUrl = getPublicArticleUrl(article);
  const [deleting, setDeleting] = useState(false);
  const [togglingPublication, setTogglingPublication] = useState(false);
  const isDraft = article.status === 'draft' && !article.publishedAt;
  const isLive = isLiveRedactionArticle(article);
  const canDelete = canDeleteAny || isDraft;

  async function shareArticle() {
    if (!publicUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url: publicUrl });
        return;
      }
      await navigator.clipboard.writeText(publicUrl);
      window.alert('Lien copié dans le presse-papiers.');
    } catch {
      // annulation partage
    }
  }

  async function deleteArticle() {
    if (!canDelete || deleting) return;
    const label = article.title || 'Sans titre';
    const confirmed = window.confirm(
      isDraft
        ? `Supprimer le brouillon « ${label} » ? Cette action est irréversible.`
        : `Supprimer définitivement l'article « ${label} » ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/redaction/articles/${article.documentId}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Suppression impossible');
      onDeleted?.(article.documentId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublication(publish: boolean) {
    if (!canManagePublication || togglingPublication) return;

    const label = article.title || 'Sans titre';
    const confirmed = window.confirm(
      publish
        ? `Publier l'article « ${label} » ?`
        : `Dépublier l'article « ${label} » ? Il ne sera plus visible sur le site.`
    );
    if (!confirmed) return;

    setTogglingPublication(true);
    try {
      const res = await fetch(`/api/redaction/articles/${article.documentId}/publication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });
      const data = (await res.json()) as { article?: RedactionArticle; error?: string };
      if (!res.ok || !data.article) {
        throw new Error(data.error ?? 'Action impossible');
      }
      onPublicationChange?.(article.documentId, data.article);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setTogglingPublication(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/articles/${article.documentId}/edit`}
          className="min-w-0 flex-1 transition-colors active:text-primary"
        >
          <p className="line-clamp-2 font-semibold leading-snug">{article.title}</p>
        </Link>
        {article.isBreaking && (
          <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            Flash
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {showAuthor && article.author?.name ? (
          <>
            {article.author.name}
            {' · '}
          </>
        ) : null}
        {article.category?.name ?? 'Sans rubrique'}
        {' · '}
        {getRedactionArticleStatusLabel(article.status)}
        {' · '}
        {formatArticleDate(getArticleDisplayDate(article))}
        {showViews && article.viewCount > 0 && ` · ${article.viewCount} vues`}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/articles/${article.documentId}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground active:bg-muted/80"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Link>
        {canManagePublication && !isLive && article.status !== 'scheduled' ? (
          <button
            type="button"
            onClick={() => void togglePublication(true)}
            disabled={togglingPublication}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {togglingPublication ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Publier
          </button>
        ) : null}
        {canManagePublication && isLive ? (
          <button
            type="button"
            onClick={() => void togglePublication(false)}
            disabled={togglingPublication}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {togglingPublication ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            Dépublier
          </button>
        ) : null}
        {publicUrl ? (
          <>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground active:bg-muted/80"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir
            </a>
            <button
              type="button"
              onClick={() => void shareArticle()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground active:bg-muted/80"
            >
              <Share2 className="h-3.5 w-3.5" />
              Partager
            </button>
          </>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={() => void deleteArticle()}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 active:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Supprimer
          </button>
        ) : null}
      </div>
    </div>
  );
}
