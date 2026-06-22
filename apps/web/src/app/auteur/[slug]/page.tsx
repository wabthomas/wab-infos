import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArticleCard } from '@/components/articles/article-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SidebarAd } from '@/components/ads/adsense';
import { getAuthorBySlug, getArticles } from '@/lib/strapi';
import { generateAuthorMetadata } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const author = await getAuthorBySlug(slug);
    if (author) {
      return generateAuthorMetadata(author);
    }
  } catch {
    // fallback
  }
  return { title: 'Auteur' };
}

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;

  let author;
  try {
    author = await getAuthorBySlug(slug);
  } catch {
    author = null;
  }

  if (!author) notFound();

  let articles: Awaited<ReturnType<typeof getArticles>>['articles'] = [];
  try {
    const result = await getArticles({ pageSize: 20 });
    articles = result.articles.filter((a) => a.author?.slug === slug);
  } catch {
    articles = [];
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ name: author.name }]} />

      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-black text-primary-foreground">
          {author.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{author.name}</h1>
          {author.role && (
            <p className="mt-1 text-sm font-medium text-primary">{author.role}</p>
          )}
          {author.bio && (
            <p className="mt-3 max-w-2xl text-muted-foreground">{author.bio}</p>
          )}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-6 text-lg font-bold uppercase tracking-wide">
            Articles de {author.name}
          </h2>
          {articles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun article publie pour le moment.</p>
          )}
        </div>
        <aside>
          <SidebarAd />
        </aside>
      </div>
    </div>
  );
}
