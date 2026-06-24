import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { getArticlePath } from '@/config/site';
import { ArticleImage } from '@/components/ui/article-image';
import { cn, formatArticleDate, getArticleDisplayDate, resolveArticleImageUrl } from '@/lib/utils';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'featured' | 'compact' | 'horizontal';
  className?: string;
  priority?: boolean;
}

export function ArticleCard({
  article,
  variant = 'default',
  className,
  priority = false,
}: ArticleCardProps) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const categoryColor = article.category?.color ?? '#E63946';
  const displayDate = getArticleDisplayDate(article);

  if (variant === 'featured') {
    return (
      <article
        className={cn(
          'group overflow-hidden rounded-2xl bg-card shadow-lg ring-1 ring-black/5 dark:ring-white/10',
          className
        )}
      >
        <Link href={href} className="block">
          {/* Mobile : image pleine + texte en dessous */}
          <div className="md:hidden">
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <ArticleImage
                src={imageUrl}
                alt={article.title}
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                priority={priority}
                sizes="100vw"
              />
              {article.isBreaking && (
                <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Flash info
                </span>
              )}
            </div>
            <div className="p-4">
              {article.category && (
                <span
                  className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: categoryColor }}
                >
                  {article.category.name}
                </span>
              )}
              <h2 className="font-display text-xl font-bold leading-snug transition-colors group-hover:text-primary">
                {article.title}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {article.author && <span className="font-medium text-foreground/80">{article.author.name}</span>}
                <time dateTime={displayDate}>{formatArticleDate(displayDate)}</time>
                <span aria-hidden>·</span>
                <span>{article.readingTime} min</span>
              </div>
            </div>
          </div>

          {/* Desktop : overlay sur l'image */}
          <div className="relative hidden md:block">
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
              <ArticleImage
                src={imageUrl}
                alt={article.title}
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                priority={priority}
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {article.isBreaking && (
                  <span className="inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    Flash info
                  </span>
                )}
                {article.category && (
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm"
                    style={{ backgroundColor: categoryColor }}
                  >
                    {article.category.name}
                  </span>
                )}
              </div>
              <h2 className="font-display text-2xl font-bold leading-tight text-white drop-shadow-sm md:text-3xl lg:text-4xl">
                {article.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                {article.author && <span className="font-medium text-white/90">{article.author.name}</span>}
                <time dateTime={displayDate}>{formatArticleDate(displayDate)}</time>
                <span aria-hidden>·</span>
                <span>{article.readingTime} min de lecture</span>
              </div>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === 'horizontal') {
    return (
      <article
        className={cn(
          'group card-elevated flex gap-4 p-3',
          className
        )}
      >
        <Link
          href={href}
          className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted md:h-28 md:w-36"
        >
          <ArticleImage
            src={imageUrl}
            alt={article.title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="144px"
          />
        </Link>
        <div className="flex flex-1 flex-col justify-center py-0.5">
          {article.category && (
            <Link
              href={`/${article.category.slug}`}
              className="mb-1.5 text-[11px] font-bold uppercase tracking-wider hover:underline"
              style={{ color: categoryColor }}
            >
              {article.category.name}
            </Link>
          )}
          <Link href={href}>
            <h3 className="font-display line-clamp-3 text-sm font-semibold leading-snug transition-colors group-hover:text-primary md:text-base">
              {article.title}
            </h3>
          </Link>
          <time dateTime={displayDate} className="mt-2 text-xs text-muted-foreground">
            {formatArticleDate(displayDate)}
          </time>
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className={cn('group flex-1', className)}>
        <Link href={href}>
          <h3 className="line-clamp-3 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
            {article.title}
          </h3>
          <time dateTime={displayDate} className="mt-1.5 block text-xs text-muted-foreground">
            {formatArticleDate(displayDate)}
          </time>
        </Link>
      </article>
    );
  }

  return (
    <article className={cn('group card-elevated overflow-hidden', className)}>
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-[16/10]">
          <ArticleImage
            src={imageUrl}
            alt={article.title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div
            className="absolute left-0 top-0 h-full w-1 opacity-0 transition-opacity group-hover:opacity-100"
            style={{ backgroundColor: categoryColor }}
          />
        </div>
        <div className="p-3 sm:p-4">
          {article.category && (
            <span
              className="mb-1.5 inline-block text-[10px] font-bold uppercase tracking-wider sm:mb-2 sm:text-[11px]"
              style={{ color: categoryColor }}
            >
              {article.category.name}
            </span>
          )}
          <h3 className="font-display line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary sm:line-clamp-3 sm:text-base md:text-lg">
            {article.title}
          </h3>
          <p className="mt-2 hidden line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:block">
            {article.excerpt}
          </p>
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground sm:mt-3 sm:pt-3 sm:text-xs">
            <time dateTime={displayDate}>{formatArticleDate(displayDate)}</time>
            <span aria-hidden>·</span>
            <span>{article.readingTime} min</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
