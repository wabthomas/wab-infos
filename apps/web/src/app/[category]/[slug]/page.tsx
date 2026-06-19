import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleHero } from '@/components/articles/article-hero';
import { ArticleSidebar } from '@/components/articles/article-sidebar';
import { RelatedArticles } from '@/components/articles/related-articles';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { InArticleAd } from '@/components/ads/adsense';
import { siteConfig, resolveArticleCategorySlug, resolveCategoryMeta, isValidCategorySlug } from '@/config/site';
import { getMockArticles } from '@/lib/mock-data';
import {
  generateArticleJsonLd,
  generateArticleMetadata,
  generateBreadcrumbJsonLd,
} from '@/lib/seo';
import { getArticleBySlug, getArticles, getRelatedArticles } from '@/lib/strapi';
import { rewriteWordPressContent } from '@/lib/utils';

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

  let related: Awaited<ReturnType<typeof getRelatedArticles>> = [];
  let liveFeed: Awaited<ReturnType<typeof getArticles>>['articles'] = [];

  try {
    const [relatedArticles, latest] = await Promise.all([
      getRelatedArticles(slug, article.category?.slug, 4),
      getArticles({ pageSize: 12 }),
    ]);
    related = relatedArticles;
    liveFeed = latest.articles
      .filter((item) => item.slug !== slug)
      .sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
  } catch {
    const mock = getMockArticles({ pageSize: 12 });
    related = mock.filter((a) => a.slug !== slug).slice(0, 4);
    liveFeed = mock
      .filter((a) => a.slug !== slug)
      .sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
  }

  const articleUrl = `${siteConfig.url}/${categorySlug}/${slug}`;
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
            <ArticleHero
              article={article}
              categoryName={cat.name}
              categoryColor={cat.color}
              categorySlug={categorySlug}
              articleUrl={articleUrl}
            />

            <div
              className="prose-article"
              dangerouslySetInnerHTML={{ __html: rewriteWordPressContent(article.content) }}
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

            <RelatedArticles
              articles={related}
              categoryName={cat.name}
              categorySlug={categorySlug}
            />
          </div>

          <ArticleSidebar
            related={related}
            liveFeed={liveFeed}
            categoryName={cat.name}
            categorySlug={categorySlug}
            categoryColor={cat.color}
          />
        </div>
      </article>
    </>
  );
}
