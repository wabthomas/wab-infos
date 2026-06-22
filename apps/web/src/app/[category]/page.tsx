import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArticleCard } from '@/components/articles/article-card';
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!isValidCategorySlug(category)) {
    const legacyPath = await resolveLegacyArticlePath(category);
    if (legacyPath) {
      redirect(legacyPath);
    }
    return { title: 'Rubrique non trouvée' };
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
      redirect(legacyPath);
    }
    notFound();
  }

  const cat = getCategoryBySlug(category)!;
  const pageSize = isLowMemBuild() ? 12 : 20;

  const [categoryResult, liveResult] = await Promise.allSettled([
    getArticles({ category, pageSize }),
    getLiveFeed(4),
  ]);

  let articles =
    categoryResult.status === 'fulfilled'
      ? categoryResult.value.articles
      : getMockArticlesIfEnabled({ category, pageSize });

  let liveFeed =
    liveResult.status === 'fulfilled'
      ? liveResult.value
      : getMockArticlesIfEnabled({ pageSize: 4 });

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[{ name: cat.name }]} />
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div
          className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl"
          style={{ backgroundColor: cat.color }}
        />
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 blur-2xl"
          style={{ backgroundColor: cat.color }}
        />
        <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: cat.color }}>
          Rubrique
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: cat.color }}>
          {cat.name}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Toute l&apos;actualité {cat.name.toLowerCase()} sur {siteConfig.name}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {articles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucun article dans cette rubrique pour le moment.
            </p>
          )}
        </div>
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
  );
}
