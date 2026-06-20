import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { ArrowRight } from 'lucide-react';
import { getArticlePath } from '@/config/site';
import { ArticleImage } from '@/components/ui/article-image';
import { cn, formatRelativeDate, formatTime, getStrapiMediaUrl } from '@/lib/utils';

interface LiveNewsTimelineProps {
  articles: Article[];
  maxItems?: number;
  excludeSlugs?: string[];
  footerHref?: string;
  footerLabel?: string;
}

export function LiveNewsTimeline({
  articles,
  maxItems = 4,
  excludeSlugs = [],
  footerHref = '/actualite',
  footerLabel = 'Toute l\'actualité',
}: LiveNewsTimelineProps) {
  const excluded = new Set(excludeSlugs);
  const items = articles.filter((article) => !excluded.has(article.slug)).slice(0, maxItems);

  if (!items.length) return null;

  return (
    <div className="widget-card overflow-hidden">
      <div className="widget-card-header flex items-center justify-between gap-2 bg-gradient-to-r from-primary/8 to-transparent">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-widest">En direct</h3>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          Live
        </span>
      </div>

      <div className="relative px-2 py-3 sm:px-3">
        <div
          className="pointer-events-none absolute bottom-4 left-[1.35rem] top-4 w-px bg-gradient-to-b from-primary/60 via-border/80 to-transparent"
          aria-hidden
        />

        <ul className="space-y-0.5">
          {items.map((article, index) => {
            const href = getArticlePath(article);
            const imageUrl = getStrapiMediaUrl(article.featuredImage?.url);
            const categoryColor = article.category?.color ?? '#E63946';
            const isLatest = index === 0;

            return (
              <li key={article.id}>
                <Link
                  href={href}
                  className={cn(
                    'group flex gap-2.5 rounded-lg p-2 transition-colors sm:gap-3',
                    isLatest
                      ? 'bg-primary/[0.04] ring-1 ring-primary/10 hover:bg-primary/[0.07]'
                      : 'hover:bg-muted/60'
                  )}
                >
                  <div className="flex w-9 shrink-0 flex-col items-center pt-1.5">
                    <span
                      className={cn(
                        'relative z-10 rounded-full border-2 border-background transition-colors',
                        isLatest
                          ? 'h-3 w-3 bg-primary shadow-[0_0_0_3px] shadow-primary/20'
                          : 'h-2 w-2 bg-muted-foreground/35 group-hover:bg-primary/60'
                      )}
                      aria-hidden
                    />
                    <time
                      dateTime={article.publishedAt}
                      className="mt-1 text-center text-[9px] font-bold tabular-nums leading-none text-muted-foreground"
                    >
                      {formatTime(article.publishedAt)}
                    </time>
                  </div>

                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/50 sm:h-14 sm:w-[4.5rem]">
                    <ArticleImage
                      src={imageUrl}
                      alt=""
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="72px"
                    />
                    {article.isBreaking && (
                      <span className="absolute left-0.5 top-0.5 rounded bg-red-600 px-1 py-px text-[7px] font-bold uppercase text-white">
                        Flash
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      {article.category && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: categoryColor }}
                        >
                          {article.category.name}
                        </span>
                      )}
                      {isLatest && (
                        <span className="text-[9px] font-semibold text-primary">
                          {formatRelativeDate(article.publishedAt)}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'line-clamp-2 text-sm leading-snug transition-colors group-hover:text-primary',
                        isLatest ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {article.title}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {footerHref && (
        <div className="border-t border-border bg-muted/30 px-4 py-2.5">
          <Link
            href={footerHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            {footerLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
