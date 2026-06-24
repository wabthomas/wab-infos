import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleHero } from '@/components/articles/article-hero';
import { ArticleSidebar } from '@/components/articles/article-sidebar';
import { RelatedArticles } from '@/components/articles/related-articles';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  ArticleBottomAd,
  ArticleTopAd,
  StickyMobileAd,
} from '@/components/ads/adsense';
import { ArticleBodyWithAds } from '@/components/articles/article-body-with-ads';
import { siteConfig, resolveArticleCategorySlug, resolveCategoryMeta, isValidCategorySlug } from '@/config/site';
import { findMockArticleBySlug, getMockArticlesIfEnabled } from '@/lib/mock-data';
import {
  generateArticleJsonLd,
  generateArticleMetadata,
  generateBreadcrumbJsonLd,
} from '@/lib/seo';
import { getArticleBySlug, getRelatedArticles, getApprovedComments } from '@/lib/strapi';
import { getLiveFeed } from '@/lib/sidebar-data';
import { compareArticlesByDateDesc, formatArticleContent } from '@/lib/utils';
import { ArticleCommentForm } from '@/components/comments/article-comment-form';
import { ArticleCommentsList } from '@/components/comments/article-comments-list';
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

  let related: Awaited<ReturnType<typeof getRelatedArticles>> = [];
  let liveFeed: Awaited<ReturnType<typeof getLiveFeed>> = [];
  let comments: Awaited<ReturnType<typeof getApprovedComments>> = [];

  const [relatedResult, liveResult, commentsResult] = await Promise.allSettled([
    getRelatedArticles(slug, article.category?.slug, 4),
    getLiveFeed(12),
    getApprovedComments(article.documentId),
  ]);

  if (relatedResult.status === 'fulfilled') {
    related = relatedResult.value;
  } else {
    related = getMockArticlesIfEnabled({ pageSize: 12 })
      .filter((a) => a.slug !== slug)
      .slice(0, 4);
  }

  if (liveResult.status === 'fulfilled') {
    liveFeed = liveResult.value.filter((item) => item.slug !== slug);
  } else {
    liveFeed = getMockArticlesIfEnabled({ pageSize: 12 })
      .filter((a) => a.slug !== slug)
      .sort(compareArticlesByDateDesc);
  }

  if (commentsResult.status === 'fulfilled') {
    comments = commentsResult.value;
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

            <RelatedArticles
              articles={related}
              categoryName={cat.name}
              categorySlug={categorySlug}
            />

            <ArticleCommentsList comments={comments} />
            <ArticleCommentForm articleDocumentId={article.documentId} />
          </div>

          <ArticleSidebar
            related={related}
            liveFeed={liveFeed}
            categoryName={cat.name}
            categorySlug={categorySlug}
            categoryColor={cat.color}
            excludeArticleSlugs={[slug]}
          />
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
