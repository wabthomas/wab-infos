import { BreakingNewsTicker } from '@/components/articles/breaking-news-ticker';
import { ArticleCard } from '@/components/articles/article-card';
import { HeaderAd, SidebarAd } from '@/components/ads/adsense';
import { SectionHeader } from '@/components/ui/section-header';
import { categories } from '@/config/site';
import { getMockArticles } from '@/lib/mock-data';
import { getBreakingNews, getFeaturedArticles, getArticles } from '@/lib/strapi';
import Link from 'next/link';

async function getHomeData() {
  try {
    const [breaking, featured, latest] = await Promise.all([
      getBreakingNews(),
      getFeaturedArticles(),
      getArticles({ pageSize: 12 }),
    ]);
    return {
      breaking,
      featured,
      latest: latest.articles,
      useMock: false,
    };
  } catch {
    return {
      breaking: getMockArticles({ breaking: true }),
      featured: getMockArticles({ featured: true, pageSize: 3 }),
      latest: getMockArticles({ pageSize: 12 }),
      useMock: true,
    };
  }
}

export const revalidate = 60;

export default async function HomePage() {
  const { breaking, featured, latest } = await getHomeData();
  const heroArticle = featured[0];
  const sideFeatured = featured.slice(1, 3);
  const gridArticles = latest.slice(heroArticle ? 0 : 0, 9);
  const topRead = [...latest].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);

  return (
    <>
      <BreakingNewsTicker articles={breaking} />
      <HeaderAd />

      <div className="container mx-auto px-4 py-8">
        {heroArticle && (
          <section className="mb-10 grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ArticleCard article={heroArticle} variant="featured" priority />
            </div>
            <div className="flex flex-col gap-4">
              {sideFeatured.map((article) => (
                <ArticleCard key={article.id} article={article} variant="horizontal" />
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            {categories.slice(0, 4).map((cat) => {
              const catArticles = latest.filter((a) => a.category?.slug === cat.slug).slice(0, 4);
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
              <SectionHeader title="Dernières actualités" />
              <div className="grid gap-5 sm:grid-cols-2">
                {gridArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <SidebarAd />

            <div className="widget-card">
              <div className="widget-card-header">
                <h3 className="text-xs font-bold uppercase tracking-widest">Les plus lus</h3>
              </div>
              <div className="divide-y divide-border p-2">
                {topRead.map((article, i) => (
                  <div key={article.id} className="flex gap-3 p-3 transition-colors hover:bg-muted/50">
                    <span className="rank-number w-7 shrink-0 pt-0.5">{i + 1}</span>
                    <ArticleCard article={article} variant="compact" />
                  </div>
                ))}
              </div>
            </div>

            <div className="widget-card">
              <div className="widget-card-header">
                <h3 className="text-xs font-bold uppercase tracking-widest">Rubriques</h3>
              </div>
              <div className="flex flex-wrap gap-2 p-4">
                {categories.map((cat) => (
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
      </div>
    </>
  );
}
