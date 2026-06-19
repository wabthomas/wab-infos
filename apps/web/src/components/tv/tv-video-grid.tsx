import type { Video } from '@wab-infos/shared';
import { YouTubeEmbed } from '@/components/tv/youtube-embed';

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
      {videos.map((video) => (
        <article
          key={video.documentId || video.youtubeId}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
          <div className="p-4">
            <h3 className="font-semibold leading-snug">{video.title}</h3>
            {video.description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {video.description}
              </p>
            )}
            <time className="mt-2 block text-xs text-muted-foreground">
              {new Date(video.publishedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}
