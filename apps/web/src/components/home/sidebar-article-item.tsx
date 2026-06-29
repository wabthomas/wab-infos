import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { getArticlePath } from '@/config/site';
import { ArticleImage } from '@/components/ui/article-image';
import { cn, formatArticleDate, getArticleDisplayDate, resolveArticleImageUrl } from '@/lib/utils';

interface SidebarArticleItemProps {
  article: Article;
  rank?: number;
  className?: string;
  /** Position de la vignette (défaut : gauche, comme « Les plus lus »). */
  imagePosition?: 'left' | 'right';
  showCategory?: boolean;
  showReadingTime?: boolean;
  size?: 'default' | 'comfortable';
}

export function SidebarArticleItem({
  article,
  rank,
  className,
  imagePosition = 'left',
  showCategory = true,
  showReadingTime = false,
  size = 'default',
}: SidebarArticleItemProps) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const categoryColor = article.category?.color ?? '#E63946';
  const displayDate = getArticleDisplayDate(article);

  const imageEl = (
    <Link
      href={href}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60',
        size === 'comfortable'
          ? 'h-20 w-24 sm:h-[4.5rem] sm:w-[5.75rem]'
          : 'h-[4.25rem] w-[5.5rem]'
      )}
      tabIndex={-1}
      aria-hidden
    >
      <ArticleImage
        src={imageUrl}
        alt=""
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="92px"
      />
      {article.isBreaking && (
        <span className="absolute bottom-1 left-1 rounded bg-red-600 px-1 py-0.5 text-[8px] font-bold uppercase text-white">
          Flash
        </span>
      )}
    </Link>
  );

  const textEl = (
    <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
      {showCategory && article.category && (
        <Link
          href={`/${article.category.slug}`}
          className="mb-1 inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider hover:underline"
          style={{ color: categoryColor }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: categoryColor }}
            aria-hidden
          />
          {article.category.name}
        </Link>
      )}
      <Link href={href}>
        <h3
          className={cn(
            'line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary',
            size === 'comfortable' ? 'font-display text-[0.95rem] sm:text-base' : 'text-sm'
          )}
        >
          {article.title}
        </h3>
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        <time dateTime={displayDate}>{formatArticleDate(displayDate)}</time>
        {showReadingTime && article.readingTime > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>{article.readingTime} min</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <article
      className={cn(
        'group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60',
        imagePosition === 'right' && 'flex-row',
        className
      )}
    >
      {rank !== undefined && imagePosition === 'left' && (
        <span className="rank-number w-7 shrink-0 self-center pt-0.5 text-center">{rank}</span>
      )}

      {imagePosition === 'left' ? (
        <>
          {imageEl}
          {textEl}
        </>
      ) : (
        <>
          {textEl}
          {imageEl}
        </>
      )}
    </article>
  );
}
