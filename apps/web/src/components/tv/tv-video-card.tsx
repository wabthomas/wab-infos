import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { getVideoPagePath } from '@/config/site';
import { VideoViewCount } from '@/components/tv/video-view-count';
import { formatDisplayTitle, isValidVideoPublishedAt, type YoutubeChannelVideo } from '@/lib/youtube-channel';
import { cn, formatRelativeDate } from '@/lib/utils';

interface TvVideoCardProps {
  video: YoutubeChannelVideo;
  className?: string;
  priority?: boolean;
  /** Grande carte à la une, ou vignette compacte (liste). */
  variant?: 'card' | 'feature' | 'row';
  /** Texte clair, pour un fond sombre. */
  tone?: 'default' | 'light';
}

function thumbUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function TvVideoCard({
  video,
  className,
  priority = false,
  variant = 'card',
  tone = 'default',
}: TvVideoCardProps) {
  const href = getVideoPagePath(video.videoId);
  const title = formatDisplayTitle(video.title);
  const dateLabel = isValidVideoPublishedAt(video.publishedAt)
    ? formatRelativeDate(video.publishedAt)
    : '';
  const light = tone === 'light';

  if (variant === 'row') {
    return (
      <Link
        href={href}
        className={cn('group flex gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted/70', className)}
      >
        <div className="relative h-[4.5rem] w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={thumbUrl(video.videoId)}
            alt=""
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="112px"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-white text-white" aria-hidden />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p
            className={cn(
              'line-clamp-2 text-sm font-semibold leading-snug',
              light ? 'text-white group-hover:text-red-200' : 'group-hover:text-primary'
            )}
          >
            {title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {dateLabel ? (
              <time
                dateTime={video.publishedAt}
                className={cn('text-[11px]', light ? 'text-white/55' : 'text-muted-foreground')}
              >
                {dateLabel}
              </time>
            ) : null}
            <VideoViewCount count={video.viewCount} className={light ? 'text-white/45' : undefined} />
          </div>
        </div>
      </Link>
    );
  }

  const feature = variant === 'feature';

  return (
    <article className={cn('group min-w-0', className)}>
      <Link href={href} className="block">
        <div
          className={cn(
            'relative aspect-video w-full overflow-hidden bg-muted',
            feature ? 'rounded-2xl shadow-md ring-1 ring-black/5' : 'rounded-xl'
          )}
        >
          <Image
            src={thumbUrl(video.videoId)}
            alt=""
            fill
            unoptimized
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes={feature ? '(min-width: 1024px) 58vw, 100vw' : '(min-width: 640px) 280px, 78vw'}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
          <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform group-hover:scale-105">
            <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
          </span>
        </div>
        <h3
          className={cn(
            'mt-3 line-clamp-2 font-semibold leading-snug transition-colors',
            light ? 'text-white group-hover:text-red-200' : 'group-hover:text-primary',
            feature ? 'text-base md:text-lg' : 'text-sm'
          )}
        >
          {title}
        </h3>
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {dateLabel ? (
          <time
            dateTime={video.publishedAt}
            className={cn('text-xs', light ? 'text-white/55' : 'text-muted-foreground')}
          >
            {dateLabel}
          </time>
        ) : null}
        <VideoViewCount count={video.viewCount} className={light ? 'text-white/45' : undefined} />
      </div>
    </article>
  );
}
