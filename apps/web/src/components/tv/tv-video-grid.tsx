import Link from 'next/link';
import type { Video } from '@wab-infos/shared';
import { getVideoPagePath } from '@/config/site';
import { YouTubeEmbed } from '@/components/tv/youtube-embed';
import { getYoutubeThumbnailUrl } from '@/lib/seo';
import { isValidVideoPublishedAt } from '@/lib/youtube-channel';
import { VideoViewCount } from '@/components/tv/video-view-count';

interface TvVideoGridProps {
  videos: Video[];
  emptyMessage?: string;
}

export function TvVideoGrid({
  videos,
  emptyMessage = 'Aucune vidéo disponible pour le moment.',
}: TvVideoGridProps) {
  if (videos.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => {
        const href = getVideoPagePath(video.youtubeId);

        return (
          <article
            key={video.documentId || video.youtubeId}
            className="overflow-hidden rounded-lg border border-border bg-card"
            itemScope
            itemType="https://schema.org/VideoObject"
          >
            <Link href={href} className="block">
              <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
            </Link>
            <div className="p-4">
              <Link href={href} className="group block">
                <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary" itemProp="name">
                  {video.title}
                </h3>
              </Link>
              {video.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground" itemProp="description">
                  {video.description}
                </p>
              )}
              <meta
                itemProp="thumbnailUrl"
                content={getYoutubeThumbnailUrl(video.youtubeId)}
              />
              {isValidVideoPublishedAt(video.publishedAt) && (
                <time
                  dateTime={video.publishedAt}
                  className="mt-2 block text-xs text-muted-foreground"
                  itemProp="uploadDate"
                >
                  {new Date(video.publishedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              )}
              <VideoViewCount count={video.viewCount} className="mt-1.5" />
            </div>
          </article>
        );
      })}
    </div>
  );
}
