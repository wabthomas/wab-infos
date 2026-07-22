'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { Article } from '@wab-infos/shared';
import { getArticlePath } from '@/config/site';
import { ArticleCard } from '@/components/articles/article-card';
import { ArticleImage } from '@/components/ui/article-image';
import { cn, formatArticleDate, getArticleDisplayDate, resolveArticleImageUrl } from '@/lib/utils';

const LOAD_MORE_PAGE_SIZE = 12;

export interface ArticlesFeedProps {
  /** Clé pour réinitialiser le state (slug rubrique, requête recherche…). */
  feedKey: string;
  accentColor: string;
  initialArticles: Article[];
  initialPage: number;
  pageCount: number;
  total: number;
  emptyMessage: string;
  endMessage: string;
  loadMoreUrl: (page: number, pageSize: number) => string;
  showCategoryOnList?: boolean;
  rankedTitle?: string;
  galleryTitle?: string;
  listTitle?: string;
  loadMoreLabel?: string;
}

function RankedCard({
  article,
  rank,
  accentColor,
}: {
  article: Article;
  rank: number;
  accentColor: string;
}) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const displayDate = getArticleDisplayDate(article);

  return (
    <article className="group relative flex gap-3 overflow-hidden rounded-xl border border-border/70 bg-card p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
      <Link
        href={href}
        className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted"
        tabIndex={-1}
        aria-hidden
      >
        <ArticleImage
          src={imageUrl}
          alt=""
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="96px"
        />
        <span
          className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          {rank}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <Link href={href}>
          <h3 className="font-display line-clamp-2 text-[0.9rem] font-semibold leading-snug transition-colors group-hover:text-primary">
            {article.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <time dateTime={displayDate}>{formatArticleDate(displayDate)}</time>
          {article.readingTime > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{article.readingTime} min</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CompactCard({ article, accentColor }: { article: Article; accentColor: string }) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const displayDate = getArticleDisplayDate(article);

  return (
    <article className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <ArticleImage
            src={imageUrl}
            alt={article.title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
          <span
            className="absolute left-2 top-2 h-1 w-6 rounded-full"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
        </div>
        <div className="p-3">
          <h3 className="font-display line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {article.title}
          </h3>
          <time dateTime={displayDate} className="mt-1.5 block text-[11px] text-muted-foreground">
            {formatArticleDate(displayDate)}
          </time>
        </div>
      </Link>
    </article>
  );
}

function ListRow({
  article,
  accentColor,
  showCategory,
}: {
  article: Article;
  accentColor: string;
  showCategory?: boolean;
}) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const displayDate = getArticleDisplayDate(article);

  return (
    <article className="group flex gap-3 border-b border-border/70 py-3.5 last:border-b-0">
      <Link
        href={href}
        className="relative h-[4.5rem] w-[5.75rem] shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60"
        tabIndex={-1}
        aria-hidden
      >
        <ArticleImage
          src={imageUrl}
          alt=""
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="92px"
        />
      </Link>
      <div className="min-w-0 flex-1">
        {showCategory && article.category ? (
          <p
            className="mb-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: article.category.color || accentColor }}
          >
            {article.category.name}
          </p>
        ) : null}
        <Link href={href}>
          <h3 className="font-display line-clamp-2 text-[0.95rem] font-semibold leading-snug transition-colors group-hover:text-primary">
            {article.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <time dateTime={displayDate}>{formatArticleDate(displayDate)}</time>
          {article.readingTime > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{article.readingTime} min</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ArticlesFeed({
  feedKey,
  accentColor,
  initialArticles,
  initialPage,
  pageCount,
  total,
  emptyMessage,
  endMessage,
  loadMoreUrl,
  showCategoryOnList = false,
  rankedTitle = 'À suivre',
  galleryTitle = 'En images',
  listTitle = 'Plus d’articles',
  loadMoreLabel = 'Voir plus d’articles',
}: ArticlesFeedProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialPage < pageCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setArticles(initialArticles);
    setPage(initialPage);
    setHasMore(initialPage < pageCount);
    setError('');
  }, [feedKey, initialArticles, initialPage, pageCount]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');

    const nextPage = page + 1;

    try {
      const res = await fetch(loadMoreUrl(nextPage, LOAD_MORE_PAGE_SIZE), { cache: 'no-store' });
      if (!res.ok) throw new Error('load_failed');

      const data = (await res.json()) as {
        articles: Article[];
        pagination: { page: number; pageCount: number; total: number };
      };

      setArticles((prev) => {
        const seen = new Set(prev.map((a) => a.documentId || a.slug));
        const fresh = data.articles.filter((a) => !seen.has(a.documentId || a.slug));
        return [...prev, ...fresh];
      });
      setPage(data.pagination.page);
      setHasMore(data.pagination.page < data.pagination.pageCount);
    } catch {
      setError('Impossible de charger plus d’articles. Réessayez.');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, loadMoreUrl, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { rootMargin: '280px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, articles.length]);

  if (!articles.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const featured = articles[0]!;
  const ranked = articles.slice(1, 5);
  const compact = articles.slice(5, 9);
  const rest = articles.slice(9);

  return (
    <div className="space-y-6">
      <div className="space-y-5 md:hidden">
        <ArticleCard article={featured} variant="featured" priority showExcerpt={false} />

        {ranked.length > 0 ? (
          <section aria-label={rankedTitle}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="h-4 w-1 rounded-full"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {rankedTitle}
              </h2>
            </div>
            <div className="space-y-2.5">
              {ranked.map((article, index) => (
                <RankedCard
                  key={article.documentId || article.slug}
                  article={article}
                  rank={index + 2}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </section>
        ) : null}

        {compact.length > 0 ? (
          <section aria-label={galleryTitle}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="h-4 w-1 rounded-full"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {galleryTitle}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {compact.map((article) => (
                <CompactCard
                  key={article.documentId || article.slug}
                  article={article}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section
            className="overflow-hidden rounded-2xl border border-border/70 bg-card px-3 shadow-sm"
            aria-label={listTitle}
          >
            <div
              className="mb-1 flex items-center gap-2 border-b border-border/70 px-1 py-3"
              style={{ borderBottomColor: `${accentColor}33` }}
            >
              <span
                className="h-4 w-1 rounded-full"
                style={{ backgroundColor: accentColor }}
                aria-hidden
              />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {listTitle}
              </h2>
              {total > 0 ? (
                <span className="ml-auto text-[10px] font-semibold text-muted-foreground/80">
                  {total}
                </span>
              ) : null}
            </div>
            <div>
              {rest.map((article) => (
                <ListRow
                  key={article.documentId || article.slug}
                  article={article}
                  accentColor={accentColor}
                  showCategory={showCategoryOnList}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="hidden md:block">
        <div className="mb-6">
          <ArticleCard article={featured} variant="featured" priority />
        </div>
        {articles.length > 1 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {articles.slice(1).map((article) => (
              <ArticleCard key={article.documentId || article.slug} article={article} />
            ))}
          </div>
        ) : null}
      </div>

      <div ref={sentinelRef} className="flex flex-col items-center gap-3 pt-2" aria-hidden={!hasMore}>
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </p>
        ) : null}
        {error ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {error}
          </button>
        ) : null}
        {hasMore && !loading ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className={cn(
              'inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-sm transition-[transform,opacity] hover:opacity-95 active:scale-[0.98]',
              'md:mt-2'
            )}
            style={{ backgroundColor: accentColor }}
          >
            {loadMoreLabel}
          </button>
        ) : null}
        {!hasMore && articles.length > initialArticles.length ? (
          <p className="text-xs text-muted-foreground">{endMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

interface CategoryArticlesFeedProps {
  categorySlug: string;
  categoryName: string;
  categoryColor: string;
  initialArticles: Article[];
  initialPage: number;
  pageCount: number;
  total: number;
}

export function CategoryArticlesFeed({
  categorySlug,
  categoryName,
  categoryColor,
  initialArticles,
  initialPage,
  pageCount,
  total,
}: CategoryArticlesFeedProps) {
  const loadMoreUrl = useCallback(
    (page: number, pageSize: number) =>
      `/api/categories/${encodeURIComponent(categorySlug)}/articles?page=${page}&pageSize=${pageSize}`,
    [categorySlug]
  );

  return (
    <ArticlesFeed
      feedKey={categorySlug}
      accentColor={categoryColor}
      initialArticles={initialArticles}
      initialPage={initialPage}
      pageCount={pageCount}
      total={total}
      emptyMessage={`Aucun article dans ${categoryName} pour le moment.`}
      endMessage="Vous avez parcouru toute la rubrique."
      loadMoreUrl={loadMoreUrl}
    />
  );
}
