'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { RedactionArticle } from '@/lib/redaction/types';
import { getPublicArticleUrl } from '@/lib/redaction/article-public-url';
import { isLiveRedactionArticle } from '@/lib/redaction/status-label';
import { getRedactionArticleStatusLabel } from '@/lib/redaction/status-label';
import { formatArticleDate, getArticleDisplayDate, getStrapiMediaUrl } from '@/lib/utils';
import { ArticleListOptionsMenu } from '@/components/redaction/article-list-options-menu';

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
  const editHref = `/articles/${article.documentId}/edit`;
  const thumbnailUrl = getStrapiMediaUrl(article.featuredImage?.url);
  const [deleting, setDeleting] = useState(false);
  const [togglingPublication, setTogglingPublication] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
      <Link
        href={editHref}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60"
        aria-label={`Modifier ${article.title}`}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={article.featuredImage?.alternativeText || article.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <ImageIcon className="h-6 w-6" aria-hidden />
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Link href={editHref} className="min-w-0 flex-1 transition-colors active:text-primary">
            <p className="line-clamp-2 font-semibold leading-snug">{article.title}</p>
          </Link>
          {article.isBreaking ? (
            <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              Flash
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {showAuthor && article.author?.name ? (
              <>
                <span className="font-medium text-foreground">{article.author.name}</span>
                <span className="mx-1.5">·</span>
              </>
            ) : null}
            {article.category?.name ?? 'Sans rubrique'}
            <span className="mx-1.5">·</span>
            {getRedactionArticleStatusLabel(article.status)}
            <span className="mx-1.5">·</span>
            {formatArticleDate(getArticleDisplayDate(article))}
            {showViews && article.viewCount > 0 ? (
              <>
                <span className="mx-1.5">·</span>
                {article.viewCount.toLocaleString('fr-FR')} vues
              </>
            ) : null}
          </p>
          <ArticleListOptionsMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            editHref={editHref}
            publicUrl={publicUrl}
            canDelete={canDelete}
            canManagePublication={canManagePublication}
            showPublish={!isLive && article.status !== 'scheduled'}
            showUnpublish={isLive}
            deleting={deleting}
            togglingPublication={togglingPublication}
            onPublish={() => void togglePublication(true)}
            onUnpublish={() => void togglePublication(false)}
            onShare={publicUrl ? () => void shareArticle() : undefined}
            onDelete={() => void deleteArticle()}
          />
        </div>
      </div>
    </div>
  );
}
