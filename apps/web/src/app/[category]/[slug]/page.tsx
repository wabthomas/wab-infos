import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { preload } from 'react-dom';
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
  StickyMobileAd,
} from '@/components/ads/adsense';
import { ArticleBodyWithAds } from '@/components/articles/article-body-with-ads';
import { siteConfig, resolveArticleCategorySlug, resolveCategoryMeta, isValidCategorySlug } from '@/config/site';
import { findMockArticleBySlug } from '@/lib/mock-data';
import {
  generateArticleJsonLd,
  generateArticleMetadata,
  generateBreadcrumbJsonLd,
} from '@/lib/seo';
import { getArticleBySlug } from '@/lib/strapi';
import { formatArticleContent, resolveArticleImageUrl } from '@/lib/utils';
import { GoogleSwgBasicScripts } from '@/components/google/swg-basic-scripts';
import { MobileArticleBottomBar } from '@/components/layout/mobile-article-bottom-bar';

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, category } = await params;
  try {
    const article = await getArticleBySlug(slug);
    if (article) return generateArticleMetadata(article, category);
  } catch {
    const mock = findMockArticleBySlug(slug);
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
    article = findMockArticleBySlug(slug);
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

  const articleUrl = `${siteConfig.url}/${categorySlug}/${slug}`;
  const articleJsonLd = generateArticleJsonLd(article, category);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Accueil', url: siteConfig.url },
    { name: cat.name, url: `${siteConfig.url}/${categorySlug}` },
    { name: article.title, url: articleUrl },
  ]);

  const heroImage = resolveArticleImageUrl(article.featuredImage, 'hero');
  if (heroImage) {
    preload(heroImage, { as: 'image' });
  }

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
            />

            <ArticleTopAd />

            <ArticleBodyWithAds html={formatArticleContent(article.content)} />

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
            />
          </Suspense>
        </div>
      </article>

      <StickyMobileAd />

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
