import { BreakingNewsTicker } from '@/components/articles/breaking-news-ticker';
import { ArticleCard } from '@/components/articles/article-card';
import { HomeRecentNews, RECENT_NEWS_DISPLAY_COUNT } from '@/components/home/home-recent-news';
import { HeaderAd, SidebarAd } from '@/components/ads/adsense';
import { HomeBottomSections } from '@/components/home/home-bottom-sections';
import { HomeVideoSection } from '@/components/home/home-video-section';
import { LiveNewsTimeline } from '@/components/home/live-news-timeline';
import { NewsletterSignup } from '@/components/home/newsletter-signup';
import { SidebarArticleItem } from '@/components/home/sidebar-article-item';
import { SectionHeader } from '@/components/ui/section-header';
import { categories } from '@/config/site';
import { getMockArticles } from '@/lib/mock-data';
import { getBreakingNews, getArticles } from '@/lib/strapi';
import { compareArticlesByDateDesc } from '@/lib/utils';
import Link from 'next/link';

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

async function getHomeData() {
  try {
    const [breaking, latest] = await Promise.all([
      getBreakingNews(),
      getArticles({ pageSize: 30 }),
    ]);
    return {
      breaking,
      latest: latest.articles,
    };
  } catch {
    return {
      breaking: getMockArticles({ breaking: true }),
      latest: getMockArticles({ pageSize: 30 }),
    };
  }
}

export const revalidate = 60;

export default async function HomePage() {
  const { breaking, latest } = await getHomeData();

  const recentNews = [...latest].sort(compareArticlesByDateDesc);
  const gridArticles = recentNews.slice(RECENT_NEWS_DISPLAY_COUNT, RECENT_NEWS_DISPLAY_COUNT + 9);
  const topRead = [...latest].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const liveFeed = recentNews;

  const topCategories = navCategories.filter((cat) =>
    (topSectionSlugs as readonly string[]).includes(cat.slug)
  );

  const bottomCategories = navCategories.filter((cat) =>
    (bottomSectionSlugs as readonly string[]).includes(cat.slug)
  );

  return (
    <>
      <BreakingNewsTicker articles={breaking} />
      <HeaderAd />

      <div className="container mx-auto px-3 py-5 sm:px-4 sm:py-8">
        <HomeRecentNews articles={recentNews.slice(0, RECENT_NEWS_DISPLAY_COUNT)} />

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="space-y-10 lg:col-span-2 lg:space-y-12">
            {topCategories.map((cat) => {
              const catArticles = latest
                .filter((a) => a.category?.slug === cat.slug)
                .slice(0, 4);
              if (!catArticles.length) return null;

              return (
                <section key={cat.slug}>
                  <SectionHeader
                    title={cat.name}
                    color={cat.color}
                    href={`/${cat.slug}`}
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    {catArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              );
            })}

            <section>
              <SectionHeader title="Dernières actualités" href="/recherche" linkLabel="Tout voir" />
              <div className="grid gap-5 sm:grid-cols-2">
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
          <HomeVideoSection />
          <HomeBottomSections categories={bottomCategories} articles={latest} />
        </div>
      </div>
    </>
  );
}
