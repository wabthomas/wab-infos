import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArticleCard } from '@/components/articles/article-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SidebarAd } from '@/components/ads/adsense';
import { categories, siteConfig } from '@/config/site';
import { getMockArticles } from '@/lib/mock-data';
import { generateCategoryMetadata } from '@/lib/seo';
import { getArticles } from '@/lib/strapi';

interface PageProps {
  params: Promise<{ category: string }>;
}

const categorySlugs = categories.map((c) => c.slug);

export async function generateStaticParams() {
  return categorySlugs.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return { title: 'Rubrique non trouvée' };
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

  if (!categorySlugs.includes(category as (typeof categorySlugs)[number])) {
    notFound();
  }

  const cat = categories.find((c) => c.slug === category)!;

  let articles;
  try {
    const result = await getArticles({ category, pageSize: 20 });
    articles = result.articles;
  } catch {
    articles = getMockArticles({ category, pageSize: 20 });
  }

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
        <aside>
          <SidebarAd />
        </aside>
      </div>
    </div>
  );
}
