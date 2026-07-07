import Link from 'next/link';
import { YouTubeEmbed } from '@/components/tv/youtube-embed';
import type { YoutubeChannelVideo } from '@/lib/youtube-channel';

interface YouTubeDirectPlayerProps {
  isLive: boolean;
  liveVideoId?: string;
  liveTitle?: string;
  channelId?: string;
  channelUrl?: string;
  fallbackVideo?: YoutubeChannelVideo;
  className?: string;
}

export function YouTubeDirectPlayer({
  isLive,
  liveVideoId,
  liveTitle,
  channelId,
  channelUrl,
  fallbackVideo,
  className,
}: YouTubeDirectPlayerProps) {
  if (isLive && liveVideoId) {
    return (
      <div className={className}>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
          <span className="text-sm font-semibold uppercase tracking-wide text-red-600">
            En direct
          </span>
        </div>
        <YouTubeEmbed
          videoId={liveVideoId}
          title={liveTitle ?? 'Wab-infos TV — En direct'}
          autoplay
        />
        {liveTitle && (
          <p className="mt-3 text-sm font-medium text-foreground">{liveTitle}</p>
        )}
      </div>
    );
  }

  if (isLive && channelId) {
    return (
      <div className={className}>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
          <span className="text-sm font-semibold uppercase tracking-wide text-red-600">
            En direct
          </span>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}`}
            title="Wab-infos TV — Direct"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  if (fallbackVideo) {
    const liveUrl = channelUrl
      ? `${channelUrl.replace(/\/$/, '')}/live`
      : 'https://youtube.com/@wabinfostv/live';

    return (
      <div className={className}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Dernière vidéo publiée — pas de direct pour le moment
          </span>
          <Link
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Vérifier sur YouTube
          </Link>
        </div>
        <YouTubeEmbed videoId={fallbackVideo.videoId} title={fallbackVideo.title} />
        <p className="mt-3 text-base font-semibold leading-snug">{fallbackVideo.title}</p>
        <time className="mt-1 block text-xs text-muted-foreground">
          {new Date(fallbackVideo.publishedAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
    );
  }

  const liveUrl = channelUrl
    ? `${channelUrl.replace(/\/$/, '')}/live`
    : 'https://youtube.com/@wabinfostv/live';

  return (
    <a
      href={liveUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black ${className ?? ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-700/80 via-black to-black" />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center text-white">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-105">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="text-lg font-semibold">Regarder sur YouTube</span>
        <span className="text-sm text-white/80">Wab-infos TV</span>
      </div>
    </a>
  );
}
