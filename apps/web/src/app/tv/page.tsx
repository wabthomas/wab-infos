import type { Metadata } from 'next';
import Link from 'next/link';
import { Play, Podcast, Radio, Tv } from 'lucide-react';
import type { Video } from '@wab-infos/shared';
import { TvPlaylistCatalog } from '@/components/tv/tv-playlist-catalog';
import { TvVideoGrid } from '@/components/tv/tv-video-grid';
import { YouTubeDirectPlayer } from '@/components/tv/youtube-direct-player';
import { siteConfig } from '@/config/site';
import { generateBroadcastEventJsonLd, generateTvPageMetadata } from '@/lib/seo';
import {
  getChannelLatestVideos,
  getChannelLiveStatus,
  getChannelPlaylistsForTab,
  getChannelRecentVideos,
  getTvTabVideos,
  enrichVideosWithViewCounts,
  enrichYoutubeChannelVideos,
  type ChannelLiveStatus,
  type YoutubeChannelVideo,
  type YoutubePlaylist,
  type YoutubePlaylistTab,
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
  let playlists: YoutubePlaylist[] = [];
  let latestUploads: YoutubeChannelVideo[] = [];

  const playlistTab: YoutubePlaylistTab | null =
    tab === 'replay' || tab === 'emission' || tab === 'podcast' ? tab : null;

  if (playlistTab && channelId) {
    const [playlistResult, uploads] = await Promise.all([
      getChannelPlaylistsForTab(channelId, playlistTab),
      playlistTab === 'replay' ? getChannelLatestVideos(channelId, 24) : Promise.resolve([]),
    ]);

    const combined = await enrichYoutubeChannelVideos([
      ...uploads,
      ...playlistResult.flatMap((playlist) => playlist.videos),
    ]);
    latestUploads = combined.slice(0, uploads.length);
    let offset = uploads.length;
    playlists = playlistResult.map((playlist) => {
      const playlistVideos = combined.slice(offset, offset + playlist.videos.length);
      offset += playlist.videos.length;
      return { ...playlist, videos: playlistVideos };
    });
  }

  if (tab !== 'live' && tab !== 'podcast' && playlists.length === 0) {
    videos = await enrichVideosWithViewCounts(
      await getTvTabVideos(tab as Video['type'], channelId, 24)
    );
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
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold sm:gap-3 sm:text-3xl">
            <Tv className="h-7 w-7 text-red-600 sm:h-8 sm:w-8" />
            Wab-infos TV
          </h1>
          <a
            href={siteConfig.youtubeChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            @{siteConfig.youtubeChannelHandle}
          </a>
        </div>
      </header>

      <nav className="mb-8 flex gap-1.5 border-b border-border pb-4 sm:gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/tv?tab=${id}`}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs font-medium transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${
              tab === id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{label}</span>
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
      ) : playlistTab && playlists.length > 0 ? (
        <TvPlaylistCatalog tab={playlistTab} playlists={playlists} latest={latestUploads} />
      ) : (
        <section>
          <TvVideoGrid videos={videos} emptyMessage={tabEmptyMessages[tab]} />
        </section>
      )}
    </div>
    </>
  );
}
