import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleHero } from '@/components/articles/article-hero';
import {
  ArticleCommentsAsync,
  ArticleCommentsSkeleton,
  ArticleRelatedAsync,
  ArticleRelatedSkeleton,
  ArticleSidebarAsync,
  ArticleSidebarSkeleton,
} from '@/components/articles/article-page-async';
import {
  ArticleBottomAd,
  ArticleTopAd,
} from '@/components/ads/adsense';
import { ArticleBodyWithAds } from '@/components/articles/article-body-with-ads';
import { siteConfig, resolveArticleCategorySlug, resolveCategoryMeta, isValidCategorySlug, canonicalizeCategorySlug } from '@/config/site';
import { findMockArticleBySlug } from '@/lib/mock-data';
import {
  generateArticleJsonLd,
  generateArticleMetadata,
  generateBreadcrumbJsonLd,
} from '@/lib/seo';
import { getArticleBySlug, getRelatedArticles } from '@/lib/strapi';
import { getSiteSettings } from '@/lib/site-settings.server';
import { formatArticleContent } from '@/lib/utils';
import { GoogleSwgBasicScripts } from '@/components/google/swg-basic-scripts';
import { MobileArticleBottomBar } from '@/components/layout/mobile-article-bottom-bar';
import { pickRelatedArticles } from '@/lib/pick-related-articles';

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, category } = await params;
  let article = null;
  try {
    article = await getArticleBySlug(slug);
  } catch {
    article = findMockArticleBySlug(slug);
  }
  // Appeler notFound() ici : sinon Next peut servir 200 avec le fallback metadata.
  if (!article) notFound();
  return generateArticleMetadata(article, category);
}

export const revalidate = 300;

export default async function ArticlePage({ params }: PageProps) {
  const { category, slug } = await params;

  let article;
  try {
    article = await getArticleBySlug(slug);
  } catch {
    article = findMockArticleBySlug(slug);
  }

  if (!article) notFound();

  const siteSettings = await getSiteSettings();

  const articleCategorySlug = article.category?.slug
    ? canonicalizeCategorySlug(article.category.slug)
    : undefined;
  const urlCategorySlug = canonicalizeCategorySlug(category);

  if (articleCategorySlug && articleCategorySlug !== urlCategorySlug) {
    // Rubrique canonique différente de l’URL (ancien permalien ou lien incorrect)
    permanentRedirect(`/${articleCategorySlug}/${slug}`);
  }

  if (!articleCategorySlug && !isValidCategorySlug(urlCategorySlug)) {
    notFound();
  }

  const categorySlug = resolveArticleCategorySlug(article, urlCategorySlug);
  const cat = resolveCategoryMeta(categorySlug, {
    name: article.category?.name,
    color: article.category?.color,
  });

  const tagSlugs = article.tags?.map((tag) => tag.slug) ?? [];
  const relatedPool = await getRelatedArticles(slug, categorySlug, 10, tagSlugs, article.title);
  const readAlsoArticles = pickRelatedArticles(relatedPool, slug, 3);

  const articleUrl = `${siteConfig.url}/${categorySlug}/${slug}`;
  const articleJsonLd = generateArticleJsonLd(article, category);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Accueil', url: siteConfig.url },
    { name: cat.name, url: `${siteConfig.url}/${categorySlug}` },
    { name: article.title, url: articleUrl },
  ]);

  return (
    <>
      <GoogleSwgBasicScripts />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="container mx-auto px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ArticleHero
              article={article}
              categoryName={cat.name}
              categoryColor={cat.color}
              categorySlug={categorySlug}
              articleUrl={articleUrl}
              showViewCounts={siteSettings.showArticleViewCounts}
            />

            <ArticleTopAd />

            <ArticleBodyWithAds
              html={formatArticleContent(article.content)}
              readAlsoArticles={readAlsoArticles}
            />

            <ArticleBottomAd />

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

            <Suspense fallback={<ArticleRelatedSkeleton />}>
              <ArticleRelatedAsync
                slug={slug}
                categorySlug={categorySlug}
                categoryName={cat.name}
                tagSlugs={tagSlugs}
                title={article.title}
                excludeSlugs={readAlsoArticles.map((article) => article.slug)}
              />
            </Suspense>

            <Suspense fallback={<ArticleCommentsSkeleton />}>
              <ArticleCommentsAsync documentId={article.documentId} />
            </Suspense>
          </div>

          <Suspense fallback={<ArticleSidebarSkeleton />}>
            <ArticleSidebarAsync
              slug={slug}
              categorySlug={categorySlug}
              categoryName={cat.name}
              categoryColor={cat.color}
              tagSlugs={tagSlugs}
              title={article.title}
            />
          </Suspense>
        </div>
      </article>

      <MobileArticleBottomBar
        documentId={article.documentId}
        slug={slug}
        title={article.title}
        url={articleUrl}
        categorySlug={categorySlug}
      />
    </>
  );
}
