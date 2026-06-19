import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { ArticleImage } from '@/components/ui/article-image';
import { formatRelativeDate, formatTime, getStrapiMediaUrl } from '@/lib/utils';
import { Radio } from 'lucide-react';

interface LiveNewsTimelineProps {
  articles: Article[];
  maxItems?: number;
}

export function LiveNewsTimeline({ articles, maxItems = 8 }: LiveNewsTimelineProps) {
  const items = articles.slice(0, maxItems);
  if (!items.length) return null;

  return (
    <div className="widget-card overflow-hidden">
      <div className="widget-card-header flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-widest">Actualités en continu</h3>
        </div>
        <Radio className="h-3.5 w-3.5 text-primary" aria-hidden />
      </div>

      <div className="relative px-3 py-4">
        <div
          className="pointer-events-none absolute bottom-6 left-[1.65rem] top-6 w-px bg-gradient-to-b from-primary/50 via-border to-transparent"
          aria-hidden
        />

        <ul className="space-y-1">
          {items.map((article, index) => {
            const href = `/${article.category?.slug ?? 'actualites'}/${article.slug}`;
            const imageUrl = getStrapiMediaUrl(article.featuredImage?.url);
            const categoryColor = article.category?.color ?? '#E63946';
            const isLatest = index === 0;

            return (
              <li key={article.id}>
                <Link
                  href={href}
                  className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60"
                >
                  <div className="flex w-10 shrink-0 flex-col items-center pt-1">
                    <span
                      className={`relative z-10 rounded-full border-2 border-background ${
                        isLatest
                          ? 'h-3 w-3 bg-primary shadow-[0_0_0_3px] shadow-primary/25'
                          : 'h-2.5 w-2.5 bg-muted-foreground/40 group-hover:bg-primary/70'
                      }`}
                      aria-hidden
                    />
                    <time
                      dateTime={article.publishedAt}
                      className="mt-1.5 text-center text-[10px] font-semibold tabular-nums leading-none text-muted-foreground"
                    >
                      {formatTime(article.publishedAt)}
                    </time>
                  </div>

                  <div className="relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60">
                    <ArticleImage
                      src={imageUrl}
                      alt=""
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="72px"
                    />
                    {article.isBreaking && (
                      <span className="absolute left-1 top-1 rounded bg-primary px-1 py-px text-[8px] font-bold uppercase tracking-wide text-primary-foreground">
                        Flash
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-0.5">
                    {article.category && (
                      <span
                        className="mb-0.5 inline-block text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: categoryColor }}
                      >
                        {article.category.name}
                      </span>
                    )}
                    <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                      {article.title}
                    </p>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {formatRelativeDate(article.publishedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
