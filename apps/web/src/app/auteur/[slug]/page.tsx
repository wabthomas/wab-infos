import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { ArticleCard } from '@/components/articles/article-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SidebarAd } from '@/components/ads/adsense';
import { IMAGE_QUALITY_LCP } from '@/lib/image-quality';
import { getAuthorBySlug, getArticles } from '@/lib/strapi';
import { generateAuthorMetadata, generatePersonJsonLd } from '@/lib/seo';
import { getStrapiMediaUrl, shouldBypassNextImageOptimization } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const author = await getAuthorBySlug(slug);
    if (author) {
      try {
        const result = await getArticles({ author: slug, pageSize: 1 });
        const indexable = (result.pagination.total ?? result.articles.length) > 0;
        return generateAuthorMetadata(author, { indexable });
      } catch {
        return generateAuthorMetadata(author);
      }
    }
  } catch {
    // fallback
  }
  return {
    title: 'Auteur',
    robots: { index: false, follow: false },
  };
}

export const revalidate = 300;

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;

  let author;
  try {
    author = await getAuthorBySlug(slug);
  } catch {
    author = null;
  }

  if (!author) notFound();

  const personJsonLd = generatePersonJsonLd(author);
  const avatarUrl = getStrapiMediaUrl(author.avatar?.url);

  let articles: Awaited<ReturnType<typeof getArticles>>['articles'] = [];
  try {
    const result = await getArticles({ author: slug, pageSize: 20 });
    articles = result.articles;
  } catch {
    articles = [];
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <Breadcrumbs items={[{ name: author.name }]} />

      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={author.name}
              width={160}
              height={160}
              className="h-full w-full object-cover"
              sizes="80px"
              quality={IMAGE_QUALITY_LCP}
              unoptimized={shouldBypassNextImageOptimization(avatarUrl)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-black text-primary-foreground">
              {author.name.charAt(0)}
            </span>
          )}
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
