import Link from 'next/link';
import type { Article } from '@wab-infos/shared';
import { LiveNewsTimeline } from '@/components/home/live-news-timeline';
import { NewsletterSignup } from '@/components/home/newsletter-signup';
import { SidebarArticleItem } from '@/components/home/sidebar-article-item';
import { SidebarAd } from '@/components/ads/adsense';
import { siteConfig } from '@/config/site';
import { Radio, Tv } from 'lucide-react';

interface ArticleSidebarProps {
  related: Article[];
  liveFeed: Article[];
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
}

export function ArticleSidebar({
  related,
  liveFeed,
  categoryName,
  categorySlug,
  categoryColor = '#c41e3a',
}: ArticleSidebarProps) {
  const sidebarRelated = related.slice(0, 4);

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <SidebarAd />

      <LiveNewsTimeline articles={liveFeed} maxItems={6} />

      {sidebarRelated.length > 0 && (
        <div className="widget-card">
          <div className="widget-card-header flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest">À lire aussi</h3>
            {categorySlug && (
              <Link
                href={`/${categorySlug}`}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                {categoryName}
              </Link>
            )}
          </div>
          <div className="divide-y divide-border p-1">
            {sidebarRelated.map((article) => (
              <SidebarArticleItem key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#1a1a1a] to-black p-4 text-white shadow-md"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600">
            <Tv className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              Wab-infos TV
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug">
              Direct, replays &amp; émissions
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/tv"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-500"
          >
            <Radio className="h-3.5 w-3.5" />
            Regarder
          </Link>
          <a
            href={siteConfig.youtubeChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-[11px] text-white/60 transition-colors hover:text-white"
          >
            Chaîne @wabinfostv
          </a>
        </div>
      </div>

      <div
        className="widget-card overflow-hidden"
        style={{ borderColor: `${categoryColor}33` }}
      >
        <div
          className="border-b border-border px-4 py-3"
          style={{ backgroundColor: `${categoryColor}0d` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: categoryColor }}>
            Rubrique
          </p>
          {categorySlug && categoryName && (
            <Link
              href={`/${categorySlug}`}
              className="mt-0.5 block text-sm font-bold transition-opacity hover:opacity-80"
              style={{ color: categoryColor }}
            >
              Tous les articles — {categoryName}
            </Link>
          )}
        </div>
      </div>

      <NewsletterSignup variant="compact" />
    </aside>
  );
}
