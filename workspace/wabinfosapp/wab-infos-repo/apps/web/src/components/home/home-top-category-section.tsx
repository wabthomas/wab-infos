import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Article } from '@wab-infos/shared';
import { SidebarArticleItem } from '@/components/home/sidebar-article-item';
import { SectionHeader } from '@/components/ui/section-header';

type CategoryMeta = {
  name: string;
  slug: string;
  color: string;
};

type HomeTopCategoryVariant = 'actualite' | 'economie';

interface HomeTopCategorySectionProps {
  category: CategoryMeta;
  articles: Article[];
  variant: HomeTopCategoryVariant;
}

function ArticleList({
  articles,
  variant,
}: {
  articles: Article[];
  variant: HomeTopCategoryVariant;
}) {
  return (
    <>
      {articles.map((article) => (
        <SidebarArticleItem
          key={article.id}
          article={article}
          imagePosition="right"
          showCategory={variant === 'actualite'}
          showReadingTime={variant === 'actualite'}
          size={variant === 'actualite' ? 'comfortable' : 'default'}
        />
      ))}
    </>
  );
}

export function HomeTopCategorySection({
  category,
  articles,
  variant,
}: HomeTopCategorySectionProps) {
  const items = articles.slice(0, 4);
  if (!items.length) return null;

  if (variant === 'economie') {
    return (
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        style={{ borderTopWidth: 3, borderTopColor: category.color }}
        aria-label={category.name}
      >
        <div className="p-4 sm:p-5">
          <SectionHeader
            title={category.name}
            color={category.color}
            href={`/${category.slug}`}
            className="mb-4"
          />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border/70 bg-muted/15">
            {items.map((article) => (
              <div key={article.id} className="px-1">
                <SidebarArticleItem
                  article={article}
                  imagePosition="right"
                  showCategory={false}
                  className="rounded-none hover:bg-muted/40"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={category.name}>
      <div className="widget-card overflow-hidden">
        <div
          className="widget-card-header flex items-center justify-between gap-2"
          style={{ backgroundColor: `${category.color}10` }}
        >
          <h2
            className="font-display text-sm font-bold uppercase tracking-widest md:text-base"
            style={{ color: category.color }}
          >
            {category.name}
          </h2>
          <Link
            href={`/${category.slug}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors hover:underline"
            style={{ color: category.color }}
          >
            Tout voir
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-border p-1">
          <ArticleList articles={items} variant="actualite" />
        </div>
      </div>
    </section>
  );
}
