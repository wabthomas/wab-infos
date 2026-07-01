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

  const metaRow = (onDark = false) => (
    <div
      className={cn(
        'flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1',
        onDark && 'text-white/80'
      )}
    >
      {article.author ? (
        <ArticleAuthorMeta author={article.author} onDark={onDark} />
      ) : (
        <span
          className={cn(
            'text-sm font-medium',
            onDark ? 'text-white/70' : 'text-muted-foreground'
          )}
        >
          Rédaction Wab-infos
        </span>
      )}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm',
          onDark ? 'text-white/85' : 'text-muted-foreground'
        )}
      >
        <time dateTime={displayDate} title={formatDate(displayDate)}>
          {formatArticleDate(displayDate)}
        </time>
        <span aria-hidden className={onDark ? 'text-white/40' : 'text-muted-foreground/40'}>
          |
        </span>
        <span>{article.readingTime} min de lecture</span>
        {showViewCounts ? (
          <>
            <span aria-hidden className={onDark ? 'text-white/40' : 'text-muted-foreground/40'}>
              |
            </span>
            <ArticleViewCounter
              documentId={article.documentId}
              slug={article.slug}
              categorySlug={categorySlug}
              initialCount={article.viewCount}
            />
          </>
        ) : null}
      </div>
    </div>
  );

  const badges = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
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
  );

  return (
    <header className={cn('mb-6 md:mb-8', className)}>
      <div className="overflow-hidden rounded-2xl bg-card shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        {/* Mobile : image nette + contenu en dessous */}
        <div className="md:hidden">
          <div className="relative aspect-[16/10] w-full bg-muted">
            <ArticleImage
              src={imageUrl}
              alt={article.title}
              className="object-cover"
              priority
              sizes="100vw"
            />
          </div>
          <div className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {article.isBreaking && (
                <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Flash info
                </span>
              )}
              <Link
                href={`/${categorySlug}`}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: categoryColor }}
              >
                {categoryName}
              </Link>
            </div>
            <h1 className="font-headline text-xl font-bold leading-snug md:text-2xl">{article.title}</h1>
            <div className="mt-3">{metaRow()}</div>
            <ArticleShareButtons url={articleUrl} title={article.title} className="mt-4" />
          </div>
        </div>

        {/* Desktop : overlay */}
        <div className="relative hidden aspect-[16/9] w-full bg-muted md:block">
          <ArticleImage
            src={imageUrl}
            alt={article.title}
            className="object-cover"
            priority
            sizes="66vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8">
            {badges}
            <h1 className="font-headline text-2xl font-bold leading-tight text-white drop-shadow-sm lg:text-3xl">
              {article.title}
            </h1>
            <div className="mt-3">{metaRow(true)}</div>
            <ArticleShareButtons
              url={articleUrl}
              title={article.title}
              variant="overlay"
              className="mt-4"
            />
          </div>
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
