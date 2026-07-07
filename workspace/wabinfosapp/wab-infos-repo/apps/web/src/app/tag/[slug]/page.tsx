import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArticleCard } from '@/components/articles/article-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SidebarAd } from '@/components/ads/adsense';
import { getArticles, getTagBySlug } from '@/lib/strapi';
import { generateTagMetadata } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const tag = await getTagBySlug(slug);
    if (tag) return generateTagMetadata(tag);
  } catch {
    // fallback
  }
  return { title: 'Tag' };
}

export const revalidate = 300;

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;

  let tag;
  try {
    tag = await getTagBySlug(slug);
  } catch {
    tag = null;
  }

  if (!tag) notFound();

  let articles: Awaited<ReturnType<typeof getArticles>>['articles'] = [];
  let total = 0;
  try {
    const result = await getArticles({ tag: slug, pageSize: 24 });
    articles = result.articles;
    total = result.pagination.total;
  } catch {
    articles = [];
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ name: 'Tags', href: '/recherche' }, { name: tag.name }]} />

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Tag</p>
        <h1 className="mt-2 text-3xl font-bold">{tag.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {total > 0
            ? `${total} article${total > 1 ? 's' : ''} sur ${tag.name}`
            : `Actualités taguées « ${tag.name} »`}
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
            <p className="text-muted-foreground">Aucun article publié avec ce tag pour le moment.</p>
          )}
        </div>
        <aside>
          <SidebarAd />
        </aside>
      </div>
    </div>
  );
}
