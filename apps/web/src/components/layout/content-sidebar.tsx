import Link from 'next/link';
import Image from 'next/image';
import type { Article, Video } from '@wab-infos/shared';
import { ArrowRight, Play, Radio, Tv } from 'lucide-react';
import { categories, getVideoPagePath, siteConfig } from '@/config/site';
import { LiveNewsTimeline } from '@/components/home/live-news-timeline';
import { NewsletterSignup } from '@/components/home/newsletter-signup';
import { SidebarArticleItem } from '@/components/home/sidebar-article-item';
import { SidebarAd } from '@/components/ads/adsense';
import { getYoutubeThumbnailUrl } from '@/lib/seo';
import { isValidVideoPublishedAt } from '@/lib/youtube-channel';
import { formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const navCategories = categories.filter((cat) => cat.slug !== 'wab-infos-tv');

const SIDEBAR_LIST_LIMIT = 4;

interface SidebarVideoItemProps {
  video: Pick<Video, 'youtubeId' | 'title' | 'publishedAt'>;
  index?: number;
}

function SidebarVideoItem({ video, index }: SidebarVideoItemProps) {
  const thumb = getYoutubeThumbnailUrl(video.youtubeId, 'hq');

  return (
    <article className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60">
      {index !== undefined && (
        <span className="rank-number w-6 shrink-0 self-center text-center text-sm">{index + 1}</span>
      )}
      <Link
        href={getVideoPagePath(video.youtubeId)}
        className="relative h-[4.25rem] w-[5.5rem] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60"
        tabIndex={-1}
        aria-hidden
      >
        <Image
          src={thumb}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="88px"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <Link href={getVideoPagePath(video.youtubeId)}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {video.title}
          </h3>
        </Link>
        {isValidVideoPublishedAt(video.publishedAt) && (
          <time dateTime={video.publishedAt} className="mt-1 text-[11px] text-muted-foreground">
            {formatRelativeDate(video.publishedAt)}
          </time>
        )}
      </div>
    </article>
  );
}

export interface ContentSidebarProps {
  liveFeed: Article[];
  articles?: Article[];
  articlesTitle?: string;
  articlesLink?: { href: string; label: string };
  videos?: Video[];
  videosTitle?: string;
  excludeVideoId?: string;
  excludeArticleSlugs?: string[];
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
  currentCategorySlug?: string;
  showCategories?: boolean;
  showTvPromo?: boolean;
}

function dedupeArticles(articles: Article[], excludeSlugs: Set<string>, limit: number): Article[] {
  const seen = new Set<string>();
  const result: Article[] = [];

  for (const article of articles) {
    if (excludeSlugs.has(article.slug) || seen.has(article.slug)) continue;
    seen.add(article.slug);
    result.push(article);
    if (result.length >= limit) break;
  }

  return result;
}

export function ContentSidebar({
  liveFeed,
  articles = [],
  articlesTitle = 'À lire aussi',
  articlesLink,
  videos = [],
  videosTitle = 'Autres vidéos',
  excludeVideoId,
  excludeArticleSlugs = [],
  categoryName,
  categorySlug,
  categoryColor = '#c41e3a',
  currentCategorySlug,
  showCategories = false,
  showTvPromo = true,
}: ContentSidebarProps) {
  const excludedSlugs = new Set([
    ...excludeArticleSlugs,
    ...liveFeed.slice(0, SIDEBAR_LIST_LIMIT).map((a) => a.slug),
  ]);

  const sidebarArticles = dedupeArticles(articles, excludedSlugs, SIDEBAR_LIST_LIMIT);
  const sidebarVideos = videos
    .filter((video) => video.youtubeId !== excludeVideoId)
    .slice(0, SIDEBAR_LIST_LIMIT);

  const showCategoryBlock =
    categorySlug && categoryName && categorySlug !== currentCategorySlug;

  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <SidebarAd />

      <LiveNewsTimeline
        articles={liveFeed}
        maxItems={SIDEBAR_LIST_LIMIT}
        excludeSlugs={excludeArticleSlugs}
        footerHref={currentCategorySlug ? `/${currentCategorySlug}` : '/actualite'}
        footerLabel={
          currentCategorySlug && categoryName
            ? `Toute la rubrique ${categoryName}`
            : 'Toute l\'actualité'
        }
      />

      {sidebarArticles.length > 0 && (
        <div className="widget-card">
          <div className="widget-card-header flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest">{articlesTitle}</h3>
            {articlesLink && (
              <Link
                href={articlesLink.href}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                {articlesLink.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="divide-y divide-border p-1">
            {sidebarArticles.map((article, index) => (
              <SidebarArticleItem
                key={article.id}
                article={article}
                rank={articlesTitle.toLowerCase().includes('lus') ? index + 1 : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {sidebarVideos.length > 0 && (
        <div className="widget-card">
          <div className="widget-card-header flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest">{videosTitle}</h3>
            <Link
              href="/tv"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Wab-infos TV
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border p-1">
            {sidebarVideos.map((video, index) => (
              <SidebarVideoItem key={video.youtubeId} video={video} index={index} />
            ))}
          </div>
        </div>
      )}

      {showTvPromo && (
        <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#1a1a1a] to-black p-4 text-white shadow-md">
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
      )}

      {showCategoryBlock && (
        <div
          className="widget-card overflow-hidden"
          style={{ borderColor: `${categoryColor}33` }}
        >
          <div
            className="border-b border-border px-4 py-3"
            style={{ backgroundColor: `${categoryColor}0d` }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: categoryColor }}
            >
              Rubrique
            </p>
            <Link
              href={`/${categorySlug}`}
              className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold transition-opacity hover:opacity-80"
              style={{ color: categoryColor }}
            >
              {categoryName}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {showCategories && (
        <div className="widget-card">
          <div className="widget-card-header">
            <h3 className="text-xs font-bold uppercase tracking-widest">Rubriques</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {navCategories.map((cat) => {
              const isActive = cat.slug === currentCategorySlug;

              return (
                <Link
                  key={cat.slug}
                  href={`/${cat.slug}`}
                  className={cn(
                    'category-pill border transition-opacity',
                    isActive && 'ring-2 ring-offset-1 ring-offset-background'
                  )}
                  style={{
                    color: cat.color,
                    borderColor: isActive ? cat.color : `${cat.color}33`,
                    backgroundColor: isActive ? `${cat.color}18` : `${cat.color}0d`,
                    ...(isActive ? { ringColor: `${cat.color}66` } : {}),
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <NewsletterSignup variant="compact" />
    </aside>
  );
}
