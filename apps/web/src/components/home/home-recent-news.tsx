import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import type { Article } from '@wab-infos/shared';
import { ArticleCard } from '@/components/articles/article-card';
import { ArticleImage } from '@/components/ui/article-image';
import { formatRelativeDate, getStrapiMediaUrl } from '@/lib/utils';

interface HomeRecentNewsProps {
  articles: Article[];
}

function RecentSideCard({ article, rank }: { article: Article; rank: number }) {
  const href = `/${article.category?.slug ?? 'actualites'}/${article.slug}`;
  const imageUrl = getStrapiMediaUrl(article.featuredImage?.url);
  const categoryColor = article.category?.color ?? '#E63946';

  return (
    <article className="group relative flex gap-3.5 overflow-hidden rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:gap-4 sm:p-3.5">
      <Link
        href={href}
        className="relative h-[5.5rem] w-[6.75rem] shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-32"
        tabIndex={-1}
        aria-hidden
      >
        <ArticleImage
          src={imageUrl}
          alt=""
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="128px"
        />
        <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/65 text-[10px] font-bold text-white backdrop-blur-sm">
          {rank}
        </span>
        {article.isBreaking && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            Flash
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {article.category && (
          <Link
            href={`/${article.category.slug}`}
            className="mb-1.5 inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider hover:underline"
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
          <h3 className="font-display line-clamp-3 text-sm font-semibold leading-snug transition-colors group-hover:text-primary sm:text-[0.95rem]">
            {article.title}
          </h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <time dateTime={article.publishedAt}>{formatRelativeDate(article.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{article.readingTime} min</span>
        </div>
      </div>
    </article>
  );
}

function RecentCompactCard({ article }: { article: Article }) {
  const href = `/${article.category?.slug ?? 'actualites'}/${article.slug}`;
  const imageUrl = getStrapiMediaUrl(article.featuredImage?.url);
  const categoryColor = article.category?.color ?? '#E63946';

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          {article.category && (
            <span
              className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm"
              style={{ backgroundColor: categoryColor }}
            >
              {article.category.name}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-display line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {article.title}
          </h3>
          <time dateTime={article.publishedAt} className="mt-1.5 block text-[11px] text-muted-foreground">
            {formatRelativeDate(article.publishedAt)}
          </time>
        </div>
      </Link>
    </article>
  );
}

export function HomeRecentNews({ articles }: HomeRecentNewsProps) {
  if (!articles.length) return null;

  const hero = articles[0];
  const sideArticles = articles.slice(1, 4);
  const compactRow = articles.slice(4, 8);

  return (
    <section className="mb-12" aria-labelledby="recent-news-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              En continu
            </p>
          </div>
          <h2
            id="recent-news-heading"
            className="font-display text-2xl font-bold tracking-tight md:text-3xl"
          >
            Actualités récentes
          </h2>
        </div>
        <Link
          href="/recherche"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          Toutes les actualités
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-7 xl:col-span-8">
          <ArticleCard article={hero} variant="featured" priority />
        </div>

        <div className="flex flex-col gap-3 lg:col-span-5 xl:col-span-4">
          {sideArticles.map((article, index) => (
            <RecentSideCard key={article.id} article={article} rank={index + 2} />
          ))}
        </div>
      </div>

      {compactRow.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {compactRow.map((article) => (
            <RecentCompactCard key={article.id} article={article} />
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        Dernière mise à jour {formatRelativeDate(hero.publishedAt).toLowerCase()}
      </p>
    </section>
  );
}

/** Nombre d'articles affichés dans le bloc « Actualités récentes » */
export const RECENT_NEWS_DISPLAY_COUNT = 8;
