'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  sizes = '(max-width: 768px) 100vw, 320px',
  priority = false,
  showPlayIcon = true,
  index,
  onClick,
}: OptimizedYouTubeThumbnailProps) {
  // Utilise maxresdefault pour une meilleure qualité (fallback sur hqdefault)
  const src = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const fallbackSrc = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg bg-black/40',
        className
      )}
      onClick={onClick}
    >
      <Image
        src={src}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes={sizes}
        priority={priority}
        onError={(e) => {
          // Fallback si maxresdefault n'existe pas
          const img = e.target as HTMLImageElement;
          if (img.src !== fallbackSrc) {
            img.src = fallbackSrc;
          }
        }}
      />

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
