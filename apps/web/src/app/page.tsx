import type { Metadata } from 'next';
import { Suspense } from 'react';
import { preload } from 'react-dom';
import { BreakingNewsTicker } from '@/components/articles/breaking-news-ticker';
import { ArticleCard } from '@/components/articles/article-card';
import { HomeRecentNews, RECENT_NEWS_DISPLAY_COUNT } from '@/components/home/home-recent-news';
import { HeaderAd, SidebarAd } from '@/components/ads/adsense';
import { HomeBottomSections } from '@/components/home/home-bottom-sections';
import { HomeVideoSection } from '@/components/home/home-video-section';
import { LiveNewsTimeline } from '@/components/home/live-news-timeline';
import { NewsletterSignup } from '@/components/home/newsletter-signup';
import { PushAlertsSignup } from '@/components/home/push-alerts-signup';
import { HomeTopCategorySection } from '@/components/home/home-top-category-section';
import { SectionHeader } from '@/components/ui/section-header';
import { categories } from '@/config/site';
import { getMockArticlesIfEnabled } from '@/lib/mock-data';
import { isLowMemBuild } from '@/lib/build-phase';
import { getTopReadArticles } from '@/lib/sidebar-data';
import { getBreakingNews, getArticles, getArticlesByCategories } from '@/lib/strapi';
import { compareArticlesByDateDesc, resolveArticleImageUrl } from '@/lib/utils';
import { generateHomeMetadata } from '@/lib/seo';
import { SidebarArticleItem } from '@/components/home/sidebar-article-item';
import Link from 'next/link';

export const metadata: Metadata = generateHomeMetadata();

const navCategories = categories.filter((cat) => cat.slug !== 'wab-infos-tv');

const topSectionSlugs = ['actualite', 'actualites-rdc', 'politique', 'economie'] as const;

const bottomSectionSlugs = [
  'politique',
  'sports',
  'societe',
  'securite',
  'international',
  'technologies',
] as const;

const homeSectionSlugs = [...new Set([...topSectionSlugs, ...bottomSectionSlugs])];

function buildMockArticlesByCategory(slugs: readonly string[], limitPerCategory: number) {
  return Object.fromEntries(
    slugs.map((slug) => [
      slug,
      getMockArticlesIfEnabled({ category: slug, pageSize: limitPerCategory }),
    ])
  );
}

async function getHomeData() {
  const globalPageSize = isLowMemBuild() ? 16 : RECENT_NEWS_DISPLAY_COUNT + 9;
  const perCategoryLimit = 6;

  try {
    const [breaking, latest, topRead, articlesByCategory] = await Promise.all([
      getBreakingNews(),
      getArticles({ pageSize: globalPageSize }),
      getTopReadArticles(5),
      getArticlesByCategories(homeSectionSlugs, perCategoryLimit),
    ]);
    return {
      breaking,
      latest: latest.articles,
      topRead,
      articlesByCategory,
    };
  } catch {
    const mockLatest = getMockArticlesIfEnabled({ pageSize: globalPageSize });
    return {
      breaking: getMockArticlesIfEnabled({ breaking: true }),
      latest: mockLatest,
      topRead: [...mockLatest]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 5),
      articlesByCategory: buildMockArticlesByCategory(homeSectionSlugs, perCategoryLimit),
    };
  }
}

export const revalidate = 60;

function HomeVideoFallback() {
  return (
    <div
      className="h-64 animate-pulse rounded-2xl border border-border bg-muted/40 md:h-80"
      aria-hidden
    />
  );
}

export default async function HomePage() {
  const { breaking, latest, topRead, articlesByCategory } = await getHomeData();

  const recentNews = [...latest].sort(compareArticlesByDateDesc);
  const gridArticles = recentNews.slice(RECENT_NEWS_DISPLAY_COUNT, RECENT_NEWS_DISPLAY_COUNT + 9);
  const topReadPanel = topRead.slice(0, 4);
  const liveFeed = recentNews;

  const topCategories = navCategories.filter((cat) =>
    (topSectionSlugs as readonly string[]).includes(cat.slug)
  );

  const bottomCategories = navCategories.filter((cat) =>
    (bottomSectionSlugs as readonly string[]).includes(cat.slug)
  );

  const heroImage = resolveArticleImageUrl(recentNews[0]?.featuredImage, 'hero');
  if (heroImage) {
    preload(heroImage, { as: 'image' });
  }

  return (
    <>
      <BreakingNewsTicker articles={breaking} />
      <HeaderAd />

      <div className="container mx-auto px-3 py-5 sm:px-4 sm:py-8">
        <HomeRecentNews
          articles={recentNews.slice(0, RECENT_NEWS_DISPLAY_COUNT)}
          popularArticles={topReadPanel}
        />

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="space-y-10 lg:col-span-2 lg:space-y-12">
            {topCategories.map((cat) => {
              const catArticles = (articlesByCategory[cat.slug] ?? []).slice(0, 4);
              if (!catArticles.length) return null;

              if (cat.slug === 'actualite' || cat.slug === 'economie') {
                return (
                  <HomeTopCategorySection
                    key={cat.slug}
                    category={cat}
                    articles={catArticles}
                    variant={cat.slug === 'economie' ? 'economie' : 'actualite'}
                  />
                );
              }

              return (
                <section key={cat.slug}>
                  <SectionHeader
                    title={cat.name}
                    color={cat.color}
                    href={`/${cat.slug}`}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:gap-5">
                    {catArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              );
            })}

            <section>
              <SectionHeader title="Dernières actualités" href="/recherche" linkLabel="Tout voir" />
              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                {gridArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <SidebarAd />

            <LiveNewsTimeline articles={liveFeed} />

            <NewsletterSignup />

            <PushAlertsSignup />

            <div className="widget-card">
              <div className="widget-card-header">
                <h3 className="text-xs font-bold uppercase tracking-widest">Les plus lus</h3>
              </div>
              <div className="divide-y divide-border p-1">
                {topRead.map((article, i) => (
                  <SidebarArticleItem key={article.id} article={article} rank={i + 1} />
                ))}
              </div>
            </div>

            <div className="widget-card">
              <div className="widget-card-header">
                <h3 className="text-xs font-bold uppercase tracking-widest">Rubriques</h3>
              </div>
              <div className="flex flex-wrap gap-2 p-4">
                {navCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/${cat.slug}`}
                    className="category-pill border"
                    style={{
                      color: cat.color,
                      borderColor: `${cat.color}33`,
                      backgroundColor: `${cat.color}0d`,
                    }}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-12 space-y-12">
          <Suspense fallback={<HomeVideoFallback />}>
            <HomeVideoSection />
          </Suspense>
          <HomeBottomSections categories={bottomCategories} articlesByCategory={articlesByCategory} />
        </div>
      </div>
    </>
  );
}