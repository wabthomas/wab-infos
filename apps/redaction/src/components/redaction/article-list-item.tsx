'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import Link from 'next/link';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { seoScoreToneClass } from '@wab-infos/shared';
import type { RedactionArticle } from '@/lib/redaction/types';
import { getPublicArticleUrl } from '@/lib/redaction/article-public-url';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { isLiveRedactionArticle } from '@/lib/redaction/status-label';
import { getRedactionArticleStatusLabel } from '@/lib/redaction/status-label';
import { cn, formatArticleDate, getArticleDisplayDate, getStrapiMediaUrl } from '@/lib/utils';
import { ArticleListOptionsMenu } from '@/components/redaction/article-list-options-menu';
import { useToast } from '@/components/ui/toast';

interface ArticleListItemProps {
  article: RedactionArticle;
  showViews?: boolean;
  showAuthor?: boolean;
  canDeleteAny?: boolean;
  canManagePublication?: boolean;
  variant?: 'default' | 'comfortable';
  /** Liste dashboard mobile : sans carte, métadonnées sur 2 lignes */
  layout?: 'default' | 'compact';
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (documentId: string, selected: boolean) => void;
  onDeleted?: (documentId: string) => void;
  onPublicationChange?: (documentId: string, article: RedactionArticle) => void;
}

export function ArticleListItem({
  article,
  showViews = true,
  showAuthor = false,
  canDeleteAny = false,
  canManagePublication = false,
  variant = 'default',
  layout = 'default',
  selectable = false,
  selected = false,
  onSelectedChange,
  onDeleted,
  onPublicationChange,
}: ArticleListItemProps) {
  const toast = useToast();
  const publicUrl = getPublicArticleUrl(article);
  const editHref = `/articles/${article.documentId}/edit`;
  const thumbnailUrl = getStrapiMediaUrl(article.featuredImage?.url);
  const [deleting, setDeleting] = useState(false);
  const [togglingPublication, setTogglingPublication] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [reformulating, setReformulating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDraft = article.status === 'draft' && !article.publishedAt;
  const isLive = isLiveRedactionArticle(article);
  const canDelete = canDeleteAny || isDraft;
  const canReformulate =
    canManagePublication && Boolean(article.isImported) && !isLive && !article.aiProcessedAt;

  async function reformulateArticle() {
    if (!canReformulate || reformulating) return;
    setReformulating(true);
    try {
      const res = await fetchRedaction('/api/redaction/ai/reformulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: article.documentId }),
      });
      const data = await readApiJsonResponse<{
        published?: boolean;
        seoScore?: number;
        title?: string;
        reason?: string;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Reformulation impossible');
      toast.success(
        data.published ? 'Publié par l’IA' : 'Brouillon reformulé',
        `${data.title || article.title} · SEO ${data.seoScore ?? '—'}${
          data.reason ? ` · ${data.reason}` : ''
        }`
      );
      onPublicationChange?.(article.documentId, {
        ...article,
        title: data.title || article.title,
        status: data.published ? 'published' : 'draft',
        aiAssisted: true,
        seoScore: data.seoScore,
      });
    } catch (err) {
      toast.error(
        'Reformulation impossible',
        err instanceof Error ? err.message : 'Une erreur est survenue.'
      );
    } finally {
      setReformulating(false);
    }
  }

  async function indexArticle() {
    if (!isLive || indexing) return;
    const category = article.category?.slug?.trim();
    const slug = article.slug?.trim();
    if (!category || !slug) {
      toast.error('Indexation impossible', 'Rubrique ou slug manquant.');
      return;
    }

    setIndexing(true);
    try {
      const res = await fetchRedaction('/api/redaction/seo/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'article', category, slug }),
      });
      const data = await readApiJsonResponse<{
        ok?: boolean;
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? 'Indexation impossible');
      }
      if (data.ok) {
        toast.success('Indexation envoyée', data.message);
      } else {
        toast.error('Indexation incomplète', data.message || data.error || 'Échec');
      }
    } catch (err) {
      toast.error(
        'Indexation impossible',
        err instanceof Error ? err.message : 'Une erreur est survenue.'
      );
    } finally {
      setIndexing(false);
    }
  }

  async function shareArticle() {
    if (!publicUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url: publicUrl });
        return;
      }
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié', 'Adresse de l’article placée dans le presse-papiers.');
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
      const res = await fetchRedaction(`/api/redaction/articles/${article.documentId}`, {
        method: 'DELETE',
      });
      const data = await readApiJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Suppression impossible');
      toast.success('Article supprimé');
      onDeleted?.(article.documentId);
    } catch (err) {
      toast.error(
        'Suppression impossible',
        err instanceof Error ? err.message : 'Une erreur est survenue.'
      );
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
      const res = await fetchRedaction(`/api/redaction/articles/${article.documentId}/publication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });
      const data = await readApiJsonResponse<{ article?: RedactionArticle; error?: string }>(res);
      if (!res.ok || !data.article) {
        throw new Error(data.error ?? 'Action impossible');
      }
      toast.success(
        publish ? 'Article publié' : 'Article dépublié',
        publish
          ? 'L’article est maintenant visible sur le site.'
          : 'L’article n’est plus visible sur le site.'
      );
      onPublicationChange?.(article.documentId, data.article);
    } catch (err) {
      toast.error(
        publish ? 'Publication impossible' : 'Dépublication impossible',
        err instanceof Error ? err.message : 'Une erreur est survenue.'
      );
    } finally {
      setTogglingPublication(false);
    }
  }

  const comfortable = variant === 'comfortable';
  const compact = layout === 'compact';

  const categoryLabel = article.category?.name ?? 'Sans rubrique';
  const statusLabel = getRedactionArticleStatusLabel(article.status);
  const dateLabel = formatArticleDate(getArticleDisplayDate(article));
  const viewsLabel =
    showViews && article.viewCount > 0
      ? `${article.viewCount.toLocaleString('fr-FR')} vues`
      : null;
  const seoScore =
    typeof article.seoScore === 'number' && Number.isFinite(article.seoScore)
      ? Math.round(article.seoScore)
      : null;

  const seoBadge =
    seoScore != null ? (
      <span
        className={cn(
          'inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
          seoScoreToneClass(seoScore)
        )}
        title={`Score SEO ${seoScore}/100`}
        aria-label={`Score SEO ${seoScore} sur 100`}
      >
        SEO {seoScore}
      </span>
    ) : null;

  return (
    <div
      className={cn(
        'flex gap-2.5 transition-colors lg:gap-3',
        compact
          ? 'border-0 bg-transparent p-0 lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-4 lg:hover:border-primary/20'
          : 'rounded-xl border border-border bg-card p-3 lg:hover:border-primary/20',
        comfortable && !compact && 'lg:gap-4 lg:p-4',
        selected && 'border-primary/40 bg-primary/[0.03] lg:border-primary/40'
      )}
    >
      {selectable ? (
        <label className="flex shrink-0 items-start pt-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange?.(article.documentId, event.target.checked)}
            className="h-4 w-4 rounded border-border text-primary accent-primary"
            aria-label={`Sélectionner ${article.title || 'Sans titre'}`}
          />
        </label>
      ) : null}
      <Link
        href={editHref}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60',
          compact
            ? 'h-12 w-12 lg:h-[4.5rem] lg:w-[4.5rem]'
            : comfortable
              ? 'h-16 w-16 lg:h-[4.5rem] lg:w-[4.5rem]'
              : 'h-16 w-16'
        )}
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
            <p
              className={cn(
                'line-clamp-2 font-semibold leading-snug',
                compact && 'text-sm lg:text-base'
              )}
            >
              {article.title}
            </p>
          </Link>
          {seoBadge}
          {article.isImported ? (
            <span
              className="shrink-0 rounded bg-sky-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
              title={article.sourceName ? `Source : ${article.sourceName}` : 'Article importé'}
            >
              {article.sourceName ? `Import · ${article.sourceName}` : 'Importé'}
            </span>
          ) : null}
          {article.aiAssisted ? (
            <span
              className="shrink-0 rounded bg-violet-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
              title="Reformulé ou rédigé avec l’assistant IA"
            >
              IA
            </span>
          ) : null}
          {article.isBreaking ? (
            <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              Flash
            </span>
          ) : null}
        </div>

        {compact ? (
          <div className="mt-1 space-y-0.5 lg:hidden">
            <p className="line-clamp-1 text-[11px] text-muted-foreground">
              {showAuthor && article.author?.name ? (
                <>
                  <span className="font-medium text-foreground">{article.author.name}</span>
                  <span className="mx-1">·</span>
                </>
              ) : null}
              {categoryLabel} · {statusLabel}
            </p>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {dateLabel}
                {viewsLabel ? (
                  <>
                    <span className="mx-1">·</span>
                    {viewsLabel}
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
                showIndex={isLive}
                showReformulate={canReformulate}
                deleting={deleting}
                togglingPublication={togglingPublication}
                indexing={indexing}
                reformulating={reformulating}
                onPublish={() => void togglePublication(true)}
                onUnpublish={() => void togglePublication(false)}
                onIndex={() => void indexArticle()}
                onReformulate={() => void reformulateArticle()}
                onShare={publicUrl ? () => void shareArticle() : undefined}
                onDelete={() => void deleteArticle()}
              />
            </div>
          </div>
        ) : null}

        <div className={cn('mt-1 flex items-center gap-2', compact && 'hidden lg:flex')}>
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {showAuthor && article.author?.name ? (
              <>
                <span className="font-medium text-foreground">{article.author.name}</span>
                <span className="mx-1.5">·</span>
              </>
            ) : null}
            {categoryLabel}
            <span className="mx-1.5">·</span>
            {statusLabel}
            <span className="mx-1.5">·</span>
            {dateLabel}
            {viewsLabel ? (
              <>
                <span className="mx-1.5">·</span>
                {viewsLabel}
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
            showIndex={isLive}
            showReformulate={canReformulate}
            deleting={deleting}
            togglingPublication={togglingPublication}
            indexing={indexing}
            reformulating={reformulating}
            onPublish={() => void togglePublication(true)}
            onUnpublish={() => void togglePublication(false)}
            onIndex={() => void indexArticle()}
            onReformulate={() => void reformulateArticle()}
            onShare={publicUrl ? () => void shareArticle() : undefined}
            onDelete={() => void deleteArticle()}
          />
        </div>
      </div>
    </div>
  );
}
