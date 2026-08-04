import type { Metadata } from 'next';
import {
  getActiveHomepageSections,
  getEnabledHomepageCategorySlugs,
  type Article,
  type HomepageSection,
} from '@wab-infos/shared';
import { BreakingNewsTicker } from '@/components/articles/breaking-news-ticker';
import { ArticleCard } from '@/components/articles/article-card';
import { HomeRecentNews, RECENT_NEWS_DISPLAY_COUNT } from '@/components/home/home-recent-news';
import { HeaderAd, SidebarAd } from '@/components/ads/adsense';
import { HomeBottomSections } from '@/components/home/home-bottom-sections';
import { LiveNewsTimeline } from '@/components/home/live-news-timeline';
import { NewsletterSignup } from '@/components/home/newsletter-signup';
import { PushAlertsSignup } from '@/components/home/push-alerts-signup';
import { HomeTopCategorySection } from '@/components/home/home-top-category-section';
import { SectionHeader } from '@/components/ui/section-header';
import { categories, getCategoryBySlug, siteConfig } from '@/config/site';
import { getMockArticlesIfEnabled } from '@/lib/mock-data';
import { isLowMemBuild } from '@/lib/build-phase';
import { getTopReadArticles } from '@/lib/sidebar-data';
import { getSiteSettings } from '@/lib/site-settings.server';
import { getBreakingNews, getArticles, getArticlesByCategories } from '@/lib/strapi';
import { compareArticlesByDateDesc } from '@/lib/utils';
import { generateHomeMetadata } from '@/lib/seo';
import { SidebarArticleItem } from '@/components/home/sidebar-article-item';
import Link from 'next/link';

export const metadata: Metadata = generateHomeMetadata();

const navCategories = categories.filter((cat) => cat.slug !== 'wab-infos-tv');

function buildMockArticlesByCategory(slugs: readonly string[], limitPerCategory: number) {
  return Object.fromEntries(
    slugs.map((slug) => [
      slug,
      getMockArticlesIfEnabled({ category: slug, pageSize: limitPerCategory }),
    ])
  );
}

async function getHomeData(homeSectionSlugs: readonly string[]) {
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

/** Cache home plus long → moins de cold Strapi sur le chemin TTFB critique. */
export const revalidate = 120;

function renderTopSection(section: HomepageSection, articlesByCategory: Record<string, Article[]>) {
  if (section.type !== 'category' || !section.categorySlug) return null;

  const category = getCategoryBySlug(section.categorySlug);
  if (!category) return null;

  const catArticles = (articlesByCategory[section.categorySlug] ?? []).slice(0, section.articleLimit);
  if (!catArticles.length) return null;

  if (section.layoutTheme === 'actualite-list' || section.layoutTheme === 'economie-list') {
    return (
      <HomeTopCategorySection
        key={section.id}
        category={category}
        articles={catArticles}
        variant={section.layoutTheme === 'economie-list' ? 'economie' : 'actualite'}
      />
    );
  }

  return (
    <section key={section.id}>
      <SectionHeader title={category.name} color={category.color} href={`/${category.slug}`} />
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {catArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const siteSettings = await getSiteSettings();
  const topSections = getActiveHomepageSections(siteSettings.homepageSections, 'top');
  const bottomSections = getActiveHomepageSections(siteSettings.homepageSections, 'bottom');
  const homeSectionSlugs = getEnabledHomepageCategorySlugs(siteSettings.homepageSections);
  const { chrome } = siteSettings;

  const { breaking, latest, topRead, articlesByCategory } = await getHomeData(homeSectionSlugs);

  const recentNews = [...latest].sort(compareArticlesByDateDesc);
  const gridArticles = recentNews.slice(RECENT_NEWS_DISPLAY_COUNT, RECENT_NEWS_DISPLAY_COUNT + 9);
  const topReadPanel = topRead.slice(0, 4);
  const liveFeed = recentNews;

  const bottomCategories = bottomSections
    .filter((section) => section.type === 'category' && section.categorySlug)
    .map((section) => getCategoryBySlug(section.categorySlug!))
    .filter((category): category is NonNullable<typeof category> => category != null);

  return (
    <>
      {chrome.breakingTickerEnabled ? <BreakingNewsTicker articles={breaking} /> : null}
      <HeaderAd />

      <div className="container mx-auto px-3 pb-5 pt-2 sm:px-4 sm:pb-8 sm:pt-3">
        <h1 className="sr-only">
          {siteConfig.name} — Actualités RDC et International
        </h1>
        <HomeRecentNews
          articles={recentNews.slice(0, RECENT_NEWS_DISPLAY_COUNT)}
          popularArticles={topReadPanel}
        />

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="space-y-10 lg:col-span-2 lg:space-y-12">
            {topSections.map((section) => renderTopSection(section, articlesByCategory))}

            <section>
              <SectionHeader title="Dernières actualités" href="/actualite" linkLabel="Tout voir" />
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

            {chrome.newsletterWidgetEnabled ? <NewsletterSignup /> : null}

            {chrome.pushAlertsWidgetEnabled ? <PushAlertsSignup /> : null}

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
          <HomeBottomSections
            sections={bottomSections}
            categories={bottomCategories}
            articlesByCategory={articlesByCategory}
          />
        </div>
      </div>
    </>
  );
}
