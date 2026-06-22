import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { getArticlePath } from '@/config/site';
import { ArticleImage } from '@/components/ui/article-image';
import { cn, formatArticleDate, getArticleDisplayDate, resolveArticleImageUrl } from '@/lib/utils';

interface SidebarArticleItemProps {
  article: Article;
  rank?: number;
  className?: string;
}

export function SidebarArticleItem({ article, rank, className }: SidebarArticleItemProps) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const categoryColor = article.category?.color ?? '#E63946';

  const displayDate = getArticleDisplayDate(article);

  return (
    <article
      className={cn(
        'group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60',
        className
      )}
    >
      {rank !== undefined && (
        <span className="rank-number w-7 shrink-0 self-center pt-0.5 text-center">{rank}</span>
      )}

      <Link
        href={href}
        className="relative h-[4.25rem] w-[5.5rem] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60"
        tabIndex={-1}
        aria-hidden
      >
        <ArticleImage
          src={imageUrl}
          alt=""
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="88px"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        {article.category && (
          <Link
            href={`/${article.category.slug}`}
            className="mb-1 inline-block w-fit text-[10px] font-bold uppercase tracking-wider hover:underline"
            style={{ color: categoryColor }}
          >
            {article.category.name}
          </Link>
        )}
        <Link href={href}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {article.title}
          </h3>
        </Link>
        <time dateTime={displayDate} className="mt-1 text-[11px] text-muted-foreground">
          {formatArticleDate(displayDate)}
        </time>
      </div>
    </article>
  );
}
