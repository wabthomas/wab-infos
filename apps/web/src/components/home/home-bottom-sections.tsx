import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Article } from '@wab-infos/shared';
import { ArticleCard } from '@/components/articles/article-card';
import { SidebarArticleItem } from '@/components/home/sidebar-article-item';
import { SectionHeader } from '@/components/ui/section-header';

type CategoryMeta = {
  name: string;
  slug: string;
  color: string;
};

type LayoutVariant =
  | 'featured-sidebar'
  | 'bento'
  | 'magazine-sidebar'
  | 'stack-list'
  | 'carousel';

const layoutBySlug: Record<string, LayoutVariant> = {
  politique: 'featured-sidebar',
  sports: 'bento',
  societe: 'magazine-sidebar',
  securite: 'stack-list',
  international: 'featured-sidebar',
  technologies: 'carousel',
};

interface HomeBottomSectionsProps {
  categories: readonly CategoryMeta[];
  articles: Article[];
}

function CategorySidebar({
  articles,
  category,
  title = 'Dans la rubrique',
}: {
  articles: Article[];
  category: CategoryMeta;
  title?: string;
}) {
  if (!articles.length) return null;

  return (
    <aside className="widget-card h-fit lg:sticky lg:top-24">
      <div
        className="widget-card-header flex items-center justify-between gap-2"
        style={{ backgroundColor: `${category.color}12` }}
      >
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
        <Link
          href={`/${category.slug}`}
          className="text-[11px] font-semibold hover:underline"
          style={{ color: category.color }}
        >
          Tout voir
        </Link>
      </div>
      <div className="divide-y divide-border p-1">
        {articles.map((article, index) => (
          <SidebarArticleItem key={article.id} article={article} rank={index + 1} />
        ))}
      </div>
    </aside>
  );
}

function FeaturedSidebarSection({
  category,
  articles,
}: {
  category: CategoryMeta;
  articles: Article[];
}) {
  const [hero, ...rest] = articles;
  const gridArticles = rest.slice(0, 2);
  const sidebarArticles = rest.slice(0, 4);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      style={{ borderTopColor: category.color, borderTopWidth: 3 }}
    >
      <div className="p-5 md:p-6">
        <SectionHeader title={category.name} color={category.color} href={`/${category.slug}`} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {hero && <ArticleCard article={hero} variant="featured" />}
            {gridArticles.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {gridArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="horizontal" />
                ))}
              </div>
            )}
          </div>
          <CategorySidebar articles={sidebarArticles} category={category} />
        </div>
      </div>
    </section>
  );
}

function BentoSection({ category, articles }: { category: CategoryMeta; articles: Article[] }) {
  const [hero, second, third, fourth] = articles;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-muted/40 p-5 md:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: category.color }}
        aria-hidden
      />
      <SectionHeader title={category.name} color={category.color} href={`/${category.slug}`} />
      <div className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
        {hero && (
          <div className="md:col-span-2 md:row-span-2">
            <ArticleCard article={hero} variant="featured" className="h-full" />
          </div>
        )}
        {second && (
          <div className="md:col-span-1">
            <ArticleCard article={second} />
          </div>
        )}
        {third && (
          <div className="md:col-span-1">
            <ArticleCard article={third} />
          </div>
        )}
        {fourth && (
          <div className="md:col-span-2">
            <ArticleCard article={fourth} variant="horizontal" />
          </div>
        )}
      </div>
    </section>
  );
}

function MagazineSidebarSection({
  category,
  articles,
}: {
  category: CategoryMeta;
  articles: Article[];
}) {
  const [lead, ...rest] = articles;
  const listArticles = rest.slice(0, 3);
  const sidebarArticles = rest.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-2xl border border-border">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6"
        style={{ backgroundColor: category.color, color: '#fff' }}
      >
        <h2 className="font-display text-xl font-bold md:text-2xl">{category.name}</h2>
        <Link
          href={`/${category.slug}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-white/90 transition-colors hover:text-white"
        >
          Explorer la rubrique
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-6 bg-card p-5 md:p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {lead && <ArticleCard article={lead} variant="horizontal" className="card-elevated" />}
          <ul className="divide-y divide-border rounded-xl border border-border bg-muted/30">
            {listArticles.map((article) => (
              <li key={article.id} className="p-1">
                <SidebarArticleItem article={article} />
              </li>
            ))}
          </ul>
        </div>
        <CategorySidebar
          articles={sidebarArticles}
          category={category}
          title="À ne pas manquer"
        />
      </div>
    </section>
  );
}

function StackListSection({ category, articles }: { category: CategoryMeta; articles: Article[] }) {
  return (
    <section
      className="rounded-2xl border border-border bg-card py-5 pl-5 md:py-6 md:pl-6"
      style={{ borderLeftWidth: 4, borderLeftColor: category.color }}
    >
      <div className="pr-5 md:pr-6">
        <SectionHeader title={category.name} color={category.color} href={`/${category.slug}`} />
      </div>
      <div className="divide-y divide-border pr-5 md:pr-6">
        {articles.map((article) => (
          <div key={article.id} className="py-3 first:pt-0 last:pb-0">
            <ArticleCard article={article} variant="horizontal" className="border-0 bg-transparent shadow-none" />
          </div>
        ))}
      </div>
    </section>
  );
}

function CarouselSection({ category, articles }: { category: CategoryMeta; articles: Article[] }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <span
            className="mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
            style={{ backgroundColor: category.color }}
          >
            {category.name}
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight">{category.name}</h2>
        </div>
        <Link
          href={`/${category.slug}`}
          className="hidden items-center gap-1 text-sm font-semibold sm:inline-flex"
          style={{ color: category.color }}
        >
          Voir tout
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none snap-x snap-mandatory">
        {articles.map((article) => (
          <div
            key={article.id}
            className="w-[min(85vw,300px)] shrink-0 snap-start sm:w-[280px]"
          >
            <ArticleCard article={article} className="h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function renderSection(variant: LayoutVariant, category: CategoryMeta, articles: Article[]) {
  switch (variant) {
    case 'featured-sidebar':
      return <FeaturedSidebarSection category={category} articles={articles} />;
    case 'bento':
      return <BentoSection category={category} articles={articles} />;
    case 'magazine-sidebar':
      return <MagazineSidebarSection category={category} articles={articles} />;
    case 'stack-list':
      return <StackListSection category={category} articles={articles} />;
    case 'carousel':
      return <CarouselSection category={category} articles={articles} />;
    default:
      return <FeaturedSidebarSection category={category} articles={articles} />;
  }
}

export function HomeBottomSections({ categories, articles }: HomeBottomSectionsProps) {
  return (
    <div className="space-y-10 md:space-y-14">
      {categories.map((category) => {
        const catArticles = articles
          .filter((a) => a.category?.slug === category.slug)
          .slice(0, 5);
        if (!catArticles.length) return null;

        const variant = layoutBySlug[category.slug] ?? 'featured-sidebar';

        return (
          <div key={`bottom-${category.slug}`}>
            {renderSection(variant, category, catArticles)}
          </div>
        );
      })}
    </div>
  );
}
