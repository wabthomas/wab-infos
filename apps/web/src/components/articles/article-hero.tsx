import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { ArticleAuthorMeta } from '@/components/articles/article-author-meta';
import { ArticleShareButtons } from '@/components/articles/article-share-buttons';
import { ArticleViewCounter } from '@/components/articles/article-view-counter';
import { getFeaturedImageCaption } from '@/components/articles/article-featured-image';
import { ArticleImage } from '@/components/ui/article-image';
import { formatArticleDate, formatDate, getArticleDisplayDate, resolveArticleImageUrl, cn } from '@/lib/utils';

interface ArticleHeroProps {
  article: Article;
  categoryName: string;
  categoryColor: string;
  categorySlug: string;
  articleUrl: string;
  showViewCounts?: boolean;
  className?: string;
}

export function ArticleHero({
  article,
  categoryName,
  categoryColor,
  categorySlug,
  articleUrl,
  showViewCounts = true,
  className,
}: ArticleHeroProps) {
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'hero');
  const caption = getFeaturedImageCaption(article.featuredImage);
  const displayDate = getArticleDisplayDate(article);
  const imageAlt = article.featuredImage?.alternativeText || article.title;

  return (
    <header className={cn('mb-6 md:mb-8', className)}>
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        {/* Une seule image : LCP mobile + fond overlay desktop */}
        <div className="relative aspect-[16/10] w-full bg-muted md:aspect-[16/9]">
          <ArticleImage
            src={imageUrl}
            alt={imageAlt}
            className="object-cover"
            priority
            sizes="(max-width: 1023px) 100vw, 66vw"
          />
          <div
            className="absolute inset-0 hidden bg-gradient-to-t from-black/75 via-black/25 to-transparent md:block"
            aria-hidden
          />
        </div>

        {/* Contenu unique : sous l’image (mobile) / overlay bas (desktop) — un seul H1 */}
        <div className="p-4 sm:p-6 md:absolute md:inset-x-0 md:bottom-0 md:p-8">
          <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-3">
            {article.isBreaking && (
              <span className="rounded bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Flash info
              </span>
            )}
            <Link
              href={`/${categorySlug}`}
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: categoryColor }}
            >
              {categoryName}
            </Link>
          </div>

          <h1 className="font-headline text-xl font-bold leading-snug text-foreground md:text-2xl md:leading-tight md:text-white md:drop-shadow-sm lg:text-3xl">
            {article.title}
          </h1>

          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            {article.author ? (
              <ArticleAuthorMeta author={article.author} onDarkFromMd />
            ) : (
              <span className="text-sm font-medium text-muted-foreground md:text-white/70">
                Rédaction Wab-infos
              </span>
            )}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground md:text-white/85">
              <time dateTime={displayDate} title={formatDate(displayDate)}>
                {formatArticleDate(displayDate)}
              </time>
              <span aria-hidden className="text-muted-foreground/40 md:text-white/40">
                |
              </span>
              <span>{article.readingTime} min de lecture</span>
              {showViewCounts ? (
                <ArticleViewCounter
                  documentId={article.documentId}
                  slug={article.slug}
                  categorySlug={categorySlug}
                  initialCount={article.viewCount}
                  className="md:text-white/85"
                />
              ) : null}
            </div>
          </div>

          <ArticleShareButtons
            url={articleUrl}
            title={article.title}
            variant="overlay-md"
            className="mt-4"
          />
        </div>
      </div>

      {caption && (
        <p className="mt-2.5 border-l-2 border-primary/50 pl-3 text-sm leading-relaxed text-muted-foreground">
          {caption}
        </p>
      )}
    </header>
  );
}
