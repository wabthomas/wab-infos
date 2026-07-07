import type { Metadata } from 'next';
import Link from 'next/link';
import { Play, Podcast, Radio, Tv } from 'lucide-react';
import type { Video } from '@wab-infos/shared';
import { TvVideoGrid } from '@/components/tv/tv-video-grid';
import { YouTubeDirectPlayer } from '@/components/tv/youtube-direct-player';
import { siteConfig } from '@/config/site';
import { generateBroadcastEventJsonLd, generateTvPageMetadata } from '@/lib/seo';
import {
  getChannelLiveStatus,
  getChannelRecentVideos,
  getTvTabVideos,
  enrichVideosWithViewCounts,
  type ChannelLiveStatus,
} from '@/lib/youtube-channel';

export const metadata: Metadata = generateTvPageMetadata();

export const revalidate = 120;

const tabs = [
  { id: 'live', label: 'Direct', icon: Radio },
  { id: 'replay', label: 'Replays', icon: Play },
  { id: 'emission', label: 'Émissions', icon: Tv },
  { id: 'podcast', label: 'Podcasts', icon: Podcast },
] as const;

type TabId = (typeof tabs)[number]['id'];

const tabEmptyMessages: Record<Exclude<TabId, 'live'>, string> = {
  replay: 'Aucun replay pour le moment. Les dernières vidéos de la chaîne s\'afficheront ici.',
  emission: 'Aucune émission publiée pour le moment.',
  podcast: 'Aucun podcast publié pour le moment.',
};

function isValidTab(tab: string): tab is TabId {
  return tabs.some((item) => item.id === tab);
}

export default async function TVPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab = 'live' } = await searchParams;
  const tab: TabId = isValidTab(rawTab) ? rawTab : 'live';
  const channelId = siteConfig.youtubeChannelId;

  const [liveStatus, latestVideos]: [ChannelLiveStatus, Awaited<ReturnType<typeof getChannelRecentVideos>>] =
    await Promise.all([
      channelId ? getChannelLiveStatus(channelId) : Promise.resolve({ isLive: false } as ChannelLiveStatus),
      channelId ? getChannelRecentVideos(channelId, 1) : Promise.resolve([]),
    ]);

  const latestVideo = latestVideos[0];
  let videos: Video[] = [];

  if (tab !== 'live') {
    videos = await enrichVideosWithViewCounts(await getTvTabVideos(tab as Video['type'], channelId));
  }

  const liveJsonLd =
    liveStatus.isLive && liveStatus.videoId && liveStatus.title
      ? generateBroadcastEventJsonLd({
          videoId: liveStatus.videoId,
          title: liveStatus.title,
          publishedAt: liveStatus.publishedAt,
          isLive: true,
        })
      : null;

  return (
    <>
      {liveJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(liveJsonLd) }}
        />
      )}
    <div className="container mx-auto px-4 py-6">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Tv className="h-8 w-8 text-red-600" />
              Wab-infos TV
            </h1>
            <p className="mt-2 text-muted-foreground">
              Direct, replays, émissions et podcasts
            </p>
          </div>
          <a
            href={siteConfig.youtubeChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Radio className="h-4 w-4 text-red-600" />
            Chaîne YouTube @wabinfostv
          </a>
        </div>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/tv?tab=${id}`}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'live' ? (
        <section>
          <YouTubeDirectPlayer
            isLive={liveStatus.isLive}
            liveVideoId={liveStatus.videoId}
            liveTitle={liveStatus.title}
            channelId={channelId || undefined}
            channelUrl={siteConfig.youtubeChannelUrl}
            fallbackVideo={latestVideo}
            className="max-w-4xl"
          />
        </section>
      ) : (
        <section>
          <TvVideoGrid videos={videos} emptyMessage={tabEmptyMessages[tab]} />
        </section>
      )}
    </div>
    </>
  );
}
