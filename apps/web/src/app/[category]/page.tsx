import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryArticlesFeed } from '@/components/category/category-articles-feed';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ContentSidebar } from '@/components/layout/content-sidebar';
import {
  getCategoryBySlug,
  isValidCategorySlug,
  siteConfig,
} from '@/config/site';
import { getMockArticlesIfEnabled } from '@/lib/mock-data';
import { isLowMemBuild } from '@/lib/build-phase';
import { resolveLegacyArticlePath } from '@/lib/legacy-url';
import { generateCategoryMetadata } from '@/lib/seo';
import { getLiveFeed } from '@/lib/sidebar-data';
import { getArticles } from '@/lib/strapi';

interface PageProps {
  params: Promise<{ category: string }>;
}

/** Première vague SSR — le reste arrive via lazy load / « Voir plus ». */
const CATEGORY_INITIAL_PAGE_SIZE = 12;
const CATEGORY_INITIAL_PAGE_SIZE_LOW_MEM = 8;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!isValidCategorySlug(category)) {
    return {
      title: 'Rubrique non trouvée',
      robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    };
  }
  const cat = getCategoryBySlug(category)!;
  return generateCategoryMetadata({
    id: 0,
    documentId: '',
    name: cat.name,
    slug: cat.slug,
    color: cat.color,
  });
}

export const revalidate = 60;

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;

  if (!isValidCategorySlug(category)) {
    const legacyPath = await resolveLegacyArticlePath(category);
    if (legacyPath) {
      permanentRedirect(legacyPath);
    }
    notFound();
  }

  const cat = getCategoryBySlug(category)!;
  const pageSize = isLowMemBuild()
    ? CATEGORY_INITIAL_PAGE_SIZE_LOW_MEM
    : CATEGORY_INITIAL_PAGE_SIZE;

  const [categoryResult, liveResult] = await Promise.allSettled([
    getArticles({ category, pageSize, page: 1 }),
    getLiveFeed(4),
  ]);

  const fulfilled =
    categoryResult.status === 'fulfilled'
      ? categoryResult.value
      : {
          articles: getMockArticlesIfEnabled({ category, pageSize }),
          pagination: { total: 0, pageCount: 1 },
        };

  const articles = fulfilled.articles;
  const pagination = fulfilled.pagination;

  const liveFeed =
    liveResult.status === 'fulfilled'
      ? liveResult.value
      : getMockArticlesIfEnabled({ pageSize: 4 });

  const totalLabel =
    pagination.total > 0
      ? `${pagination.total} article${pagination.total > 1 ? 's' : ''}`
      : null;

  return (
    <div className="container mx-auto px-3 pb-10 pt-4 sm:px-4 sm:py-8">
      <div className="mb-3 sm:mb-4">
        <Breadcrumbs items={[{ name: cat.name }]} />
      </div>

      {/* Header thématique — compact mobile, plus ample desktop */}
      <header
        className="relative mb-6 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm sm:mb-10"
        style={{
          backgroundImage: `linear-gradient(135deg, ${cat.color}14 0%, transparent 55%)`,
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1 sm:w-1.5"
          style={{ backgroundColor: cat.color }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-[0.12] blur-3xl"
          style={{ backgroundColor: cat.color }}
          aria-hidden
        />
        <div className="relative px-4 py-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] sm:text-xs sm:tracking-widest"
              style={{ color: cat.color }}
            >
              Rubrique
            </p>
            {totalLabel ? (
              <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/70 sm:text-[11px]">
                {totalLabel}
              </span>
            ) : null}
          </div>
          <h1
            className="font-display mt-1.5 text-2xl font-bold tracking-tight sm:mt-2 sm:text-3xl md:text-4xl"
            style={{ color: cat.color }}
          >
            {cat.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
            Toute l&apos;actualité {cat.name.toLowerCase()} sur {siteConfig.name}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CategoryArticlesFeed
            categorySlug={cat.slug}
            categoryName={cat.name}
            categoryColor={cat.color}
            initialArticles={articles}
            initialPage={1}
            pageCount={Math.max(1, pagination.pageCount)}
            total={pagination.total}
          />
        </div>
        <div className="hidden lg:block">
          <ContentSidebar
            liveFeed={liveFeed}
            articles={articles.length > 4 ? articles.slice(4, 12) : articles}
            articlesTitle={articles.length > 4 ? 'Suite de la rubrique' : `Dans ${cat.name}`}
            articlesLink={{ href: `/${cat.slug}`, label: 'Tout voir' }}
            categoryName={cat.name}
            categorySlug={cat.slug}
            categoryColor={cat.color}
            currentCategorySlug={cat.slug}
            showCategories
          />
        </div>
      </div>
    </div>
  );
}
