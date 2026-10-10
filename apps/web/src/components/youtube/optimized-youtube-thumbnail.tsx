'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 1) Proxy site (fiable Chrome) → 2) ytimg / youtube directs en secours.
 */
const THUMB_SOURCES = [
  (id: string) => `/api/yt-thumb/${id}`,
  (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
] as const;

export function youtubeThumbUrl(videoId: string, quality: 'hqdefault' | 'mqdefault' | 'sddefault' = 'hqdefault') {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

interface OptimizedYouTubeThumbnailProps {
  videoId: string;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  showPlayIcon?: boolean;
  index?: number;
  onClick?: () => void;
}

export function OptimizedYouTubeThumbnail({
  videoId,
  title,
  className,
  priority = false,
  showPlayIcon = true,
  index,
  onClick,
}: OptimizedYouTubeThumbnailProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = THUMB_SOURCES[Math.min(sourceIndex, THUMB_SOURCES.length - 1)](videoId);

  return (
    <div
      className={cn('group relative overflow-hidden rounded-lg bg-zinc-800', className)}
      onClick={onClick}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxy + referrerPolicy hors next/image
        <img
          key={src}
          src={src}
          alt=""
          title={title}
          referrerPolicy="no-referrer"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => {
            setSourceIndex((current) => {
              if (current < THUMB_SOURCES.length - 1) return current + 1;
              setFailed(true);
              return current;
            });
          }}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900"
          aria-hidden
        >
          <Play className="h-8 w-8 fill-white/40 text-white/40" />
        </div>
      )}

      {showPlayIcon && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
      )}

      {typeof index === 'number' && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
          {index + 2}
        </span>
      )}
    </div>
  );
}
