import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { Article } from '@wab-infos/shared';
import { getArticlePath } from '@/config/site';
import { ArticleCard } from '@/components/articles/article-card';
import { ArticleImage } from '@/components/ui/article-image';
import { formatArticleDate, getArticleDisplayDate, resolveArticleImageUrl } from '@/lib/utils';

interface HomeRecentNewsProps {
  articles: Article[];
  popularArticles?: Article[];
}

function RecentSideCard({ article, rank }: { article: Article; rank: number }) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const categoryColor = article.category?.color ?? '#E63946';

  const displayDate = getArticleDisplayDate(article);

  return (
    <article className="group relative flex gap-3 overflow-hidden rounded-xl border border-border/70 bg-card p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:gap-3 sm:p-3">
      <Link
        href={href}
        className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-[5.25rem] sm:w-[6.5rem]"
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
          <h3 className="font-display line-clamp-2 text-[0.9rem] font-semibold leading-snug transition-colors group-hover:text-primary sm:text-[0.95rem]">
            {article.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <time dateTime={displayDate}>{formatArticleDate(displayDate)}</time>
          <span aria-hidden>·</span>
          <span>{article.readingTime} min</span>
        </div>
      </div>
    </article>
  );
}

function RecentCompactCard({ article }: { article: Article }) {
  const href = getArticlePath(article);
  const imageUrl = resolveArticleImageUrl(article.featuredImage, 'card');
  const categoryColor = article.category?.color ?? '#E63946';

  const displayDate = getArticleDisplayDate(article);

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
          <time dateTime={displayDate} className="mt-1.5 block text-[11px] text-muted-foreground">
            {formatArticleDate(displayDate)}
          </time>
        </div>
      </Link>
    </article>
  );
}

function PopularArticleRow({ article }: { article: Article }) {
  const href = getArticlePath(article);
  const displayDate = getArticleDisplayDate(article);
  const categoryColor = article.category?.color ?? '#E63946';

  return (
    <article className="border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      {article.category && (
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
      <Link href={href} className="group block">
        <h3 className="font-display line-clamp-2 text-[0.9rem] font-semibold leading-snug transition-colors group-hover:text-primary sm:text-[0.95rem]">
          {article.title}
        </h3>
      </Link>
      <time dateTime={displayDate} className="mt-1.5 block text-[11px] text-muted-foreground">
        {formatArticleDate(displayDate)}
      </time>
    </article>
  );
}

function PopularPanel({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;

  return (
    <aside className="flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="border-b border-border pb-2.5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Populaires</h2>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {articles.map((article) => (
          <PopularArticleRow key={article.id} article={article} />
        ))}
      </div>
    </aside>
  );
}

export function HomeRecentNews({ articles, popularArticles = [] }: HomeRecentNewsProps) {
  if (!articles.length) return null;

  const hero = articles[0];
  const sideArticles = articles.slice(1, 4);
  const compactRow = articles.slice(4, 8);

  return (
    <section className="mb-8 md:mb-12" aria-label="Actualités récentes">
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-stretch">
        <PopularPanel articles={popularArticles} />

        <div>
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="lg:col-span-7 xl:col-span-8">
              <ArticleCard article={hero} variant="featured" priority />
            </div>

            <div className="flex flex-col gap-2.5 lg:col-span-5 xl:col-span-4">
              {sideArticles.map((article, index) => (
                <RecentSideCard key={article.id} article={article} rank={index + 2} />
              ))}
            </div>
          </div>

          {compactRow.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:mt-5 sm:gap-4 lg:grid-cols-4">
              {compactRow.map((article) => (
                <RecentCompactCard key={article.id} article={article} />
              ))}
            </div>
          )}

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Dernière mise à jour {formatArticleDate(getArticleDisplayDate(hero)).toLowerCase()}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Nombre d'articles affichés dans le bloc « Actualités récentes » */
export const RECENT_NEWS_DISPLAY_COUNT = 8;
