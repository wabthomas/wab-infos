import type { Article } from '@wab-infos/shared';
import { ArticleCard } from '@/components/articles/article-card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RelatedArticlesProps {
  articles: Article[];
  categoryName?: string;
  categorySlug?: string;
}

export function RelatedArticles({ articles, categoryName, categorySlug }: RelatedArticlesProps) {
  if (!articles.length) return null;

  return (
    <section className="mt-14 border-t border-border pt-10" aria-labelledby="related-heading">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">À lire aussi</p>
          <h2 id="related-heading" className="font-display mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {categoryName ? `Dans ${categoryName}` : 'Articles similaires'}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            D&apos;autres reportages et analyses pour approfondir le sujet.
          </p>
        </div>
        {categorySlug && (
          <Link
            href={`/${categorySlug}`}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Toute la rubrique
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} showExcerpt={false} />
        ))}
      </div>
    </section>
  );
}
