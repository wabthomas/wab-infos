import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { ArticleShareButtons } from '@/components/articles/article-share-buttons';
import { getFeaturedImageCaption } from '@/components/articles/article-featured-image';
import { ArticleImage } from '@/components/ui/article-image';
import { formatDate, formatRelativeDate, getStrapiMediaUrl, cn } from '@/lib/utils';
import { Eye } from 'lucide-react';

interface ArticleHeroProps {
  article: Article;
  categoryName: string;
  categoryColor: string;
  categorySlug: string;
  articleUrl: string;
  className?: string;
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace('.0', '')} M vues`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace('.0', '')} k vues`;
  }
  return `${count} vues`;
}

export function ArticleHero({
  article,
  categoryName,
  categoryColor,
  categorySlug,
  articleUrl,
  className,
}: ArticleHeroProps) {
  const imageUrl = getStrapiMediaUrl(article.featuredImage?.url);
  const caption = getFeaturedImageCaption(article.featuredImage);

  const metaRow = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:text-sm">
      {article.author && (
        <Link
          href={`/auteur/${article.author.slug}`}
          className="font-semibold text-foreground transition-opacity hover:opacity-80 md:text-white md:hover:opacity-80"
        >
          {article.author.name}
        </Link>
      )}
      <time dateTime={article.publishedAt} title={formatDate(article.publishedAt)}>
        {formatRelativeDate(article.publishedAt)}
      </time>
      <span aria-hidden>·</span>
      <span>{article.readingTime} min de lecture</span>
      {article.viewCount > 0 && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {formatViewCount(article.viewCount)}
          </span>
        </>
      )}
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
            <h1 className="font-display text-2xl font-bold leading-snug">{article.title}</h1>
            <div className="mt-3">{metaRow}</div>
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
            <h1 className="font-display text-3xl font-bold leading-tight text-white drop-shadow-sm lg:text-4xl">
              {article.title}
            </h1>
            <div className="mt-3 text-white/80">{metaRow}</div>
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
