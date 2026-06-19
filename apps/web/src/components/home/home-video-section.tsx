import Image from 'next/image';
import Link from 'next/link';
import { Play, Radio, Tv } from 'lucide-react';
import { YouTubeEmbed } from '@/components/tv/youtube-embed';
import { getVideoPagePath, siteConfig } from '@/config/site';
import {
  getChannelLiveStatus,
  getChannelRecentVideos,
  type ChannelLiveStatus,
  type YoutubeChannelVideo,
} from '@/lib/youtube-channel';
import { formatRelativeDate } from '@/lib/utils';

function VideoListItem({ video, index }: { video: YoutubeChannelVideo; index: number }) {
  const thumb = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

  return (
    <Link
      href={getVideoPagePath(video.videoId)}
      className="group flex gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-white/20 hover:bg-white/10"
    >
      <div className="relative h-[4.5rem] w-20 shrink-0 overflow-hidden rounded-lg bg-black/40">
        <Image
          src={thumb}
          alt={video.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="80px"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
          {index + 2}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-white group-hover:text-red-200">
          {video.title}
        </p>
        <time
          dateTime={video.publishedAt}
          className="mt-1 text-[11px] text-white/55"
        >
          {formatRelativeDate(video.publishedAt)}
        </time>
      </div>
    </Link>
  );
}

export async function HomeVideoSection() {
  const channelId = siteConfig.youtubeChannelId;

  const [liveStatus, videos]: [ChannelLiveStatus, YoutubeChannelVideo[]] = await Promise.all([
    channelId ? getChannelLiveStatus(channelId) : Promise.resolve({ isLive: false }),
    channelId ? getChannelRecentVideos(channelId, 5) : Promise.resolve([]),
  ]);

  if (!videos.length) return null;

  const featured = videos[0];
  const isShowingLive = Boolean(liveStatus.isLive && liveStatus.videoId);
  const featuredId = isShowingLive ? liveStatus.videoId! : featured.videoId;
  const featuredTitle =
    isShowingLive && liveStatus.title ? liveStatus.title : featured.title;
  const liveVideoFromFeed = isShowingLive
    ? videos.find((video) => video.videoId === liveStatus.videoId)
    : undefined;
  const featuredPublishedAt = isShowingLive
    ? liveStatus.publishedAt ?? liveVideoFromFeed?.publishedAt
    : featured.publishedAt;
  const playlist = videos.filter((video) => video.videoId !== featuredId).slice(0, 4);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#1a1a1a] via-[#111] to-black text-white shadow-xl">
      <div className="border-b border-white/10 px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-900/40">
              <Tv className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-red-400">
                Wab-infos TV
              </p>
              <h2 className="font-display text-xl font-bold md:text-2xl">Vidéos &amp; replays</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {liveStatus.isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-300 ring-1 ring-red-500/40">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                En direct
              </span>
            )}
            <Link
              href="/tv"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/15"
            >
              <Radio className="h-4 w-4 text-red-400" />
              Voir tout
            </Link>
            <a
              href={siteConfig.youtubeChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              @wabinfostv
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
            <Link href={getVideoPagePath(featuredId)}>
              <YouTubeEmbed
                videoId={featuredId}
                title={featuredTitle}
                autoplay={liveStatus.isLive}
              />
            </Link>
          </div>
          <Link
            href={getVideoPagePath(featuredId)}
            className="mt-3 block line-clamp-2 text-sm font-medium text-white/90 transition-colors hover:text-red-200 md:text-base"
          >
            {featuredTitle}
          </Link>
          {isShowingLive && !featuredPublishedAt ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-400">
              En direct
            </p>
          ) : featuredPublishedAt ? (
            <time dateTime={featuredPublishedAt} className="mt-1 block text-xs text-white/50">
              {isShowingLive
                ? `En direct — ${formatRelativeDate(featuredPublishedAt)}`
                : formatRelativeDate(featuredPublishedAt)}
            </time>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 lg:col-span-2">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/45">
            Dernières vidéos
          </p>
          {playlist.map((video, index) => (
            <VideoListItem key={video.videoId} video={video} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
