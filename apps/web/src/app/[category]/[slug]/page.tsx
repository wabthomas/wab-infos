import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/articles/article-card';
import { ArticleImage } from '@/components/ui/article-image';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { InArticleAd, SidebarAd } from '@/components/ads/adsense';
import { siteConfig, resolveArticleCategorySlug, resolveCategoryMeta, isValidCategorySlug } from '@/config/site';
import { getMockArticles } from '@/lib/mock-data';
import {
  generateArticleJsonLd,
  generateArticleMetadata,
  generateBreadcrumbJsonLd,
} from '@/lib/seo';
import { getArticleBySlug, getRecommendedArticles } from '@/lib/strapi';
import { formatDate, getStrapiMediaUrl } from '@/lib/utils';

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, category } = await params;
  try {
    const article = await getArticleBySlug(slug);
    if (article) return generateArticleMetadata(article, category);
  } catch {
    const mock = getMockArticles().find((a) => a.slug === slug);
    if (mock) return generateArticleMetadata(mock, category);
  }
  return { title: 'Article non trouvé' };
}

export const revalidate = 60;

export default async function ArticlePage({ params }: PageProps) {
  const { category, slug } = await params;

  let article;
  try {
    article = await getArticleBySlug(slug);
  } catch {
    article = getMockArticles().find((a) => a.slug === slug) ?? null;
  }

  if (!article) notFound();

  const articleCategorySlug = article.category?.slug;
  if (articleCategorySlug && articleCategorySlug !== category) {
    redirect(`/${articleCategorySlug}/${slug}`);
  }

  if (!articleCategorySlug && !isValidCategorySlug(category)) {
    notFound();
  }

  const categorySlug = resolveArticleCategorySlug(article, category);
  const cat = resolveCategoryMeta(categorySlug, {
    name: article.category?.name,
    color: article.category?.color,
  });

  let recommended: Awaited<ReturnType<typeof getRecommendedArticles>> = [];
  try {
    recommended = await getRecommendedArticles(slug);
  } catch {
    recommended = getMockArticles({ recommended: true, pageSize: 4 }).filter(
      (a) => a.slug !== slug
    );
  }

  const articleUrl = `${siteConfig.url}/${categorySlug}/${slug}`;
  const imageUrl = getStrapiMediaUrl(article.featuredImage?.url);
  const articleJsonLd = generateArticleJsonLd(article, category);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Accueil', url: siteConfig.url },
    { name: cat.name, url: `${siteConfig.url}/${categorySlug}` },
    { name: article.title, url: articleUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="container mx-auto px-4 py-6">
        <Breadcrumbs
          items={[{ name: cat.name, href: `/${categorySlug}` }, { name: article.title }]}
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <header className="mb-6">
              {article.isBreaking && (
                <span className="mb-3 inline-block rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
                  Flash info
                </span>
              )}
              <span
                className="mb-2 block text-sm font-semibold uppercase"
                style={{ color: cat.color }}
              >
                {cat.name}
              </span>
              <h1 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
                {article.title}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {article.author && (
                  <Link
                    href={`/auteur/${article.author.slug}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {article.author.name}
                  </Link>
                )}
                <time dateTime={article.publishedAt}>
                  {formatDate(article.publishedAt)}
                </time>
                <span>{article.readingTime} min de lecture</span>
              </div>
            </header>

            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-lg bg-muted">
              <ArticleImage
                src={imageUrl}
                alt={article.title}
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>

            <div
              className="prose-article"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <InArticleAd />

            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
                {article.tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/tag/${tag.slug}`}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <SidebarAd />
            {recommended.length > 0 && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">
                  À lire aussi
                </h3>
                <div className="space-y-4">
                  {recommended.map((rec) => (
                    <ArticleCard key={rec.id} article={rec} variant="horizontal" />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </article>
    </>
  );
}
