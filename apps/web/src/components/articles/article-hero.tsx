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

  return (
    <header className={cn('mb-8', className)}>
      <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        <div className="relative aspect-[16/9] w-full bg-muted">
          <ArticleImage
            src={imageUrl}
            alt={article.title}
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20" />

          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
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

            <h1 className="font-display text-2xl font-bold leading-tight text-white md:text-3xl lg:text-4xl">
              {article.title}
            </h1>

            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-relaxed text-white/85 md:text-base">
              {article.excerpt}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75 md:text-sm">
              {article.author && (
                <Link
                  href={`/auteur/${article.author.slug}`}
                  className="font-semibold text-white transition-opacity hover:opacity-80"
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
