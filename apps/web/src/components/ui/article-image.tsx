'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { imageQualityForPriority } from '@/lib/image-quality';
import { cn, shouldBypassNextImageOptimization } from '@/lib/utils';

interface ArticleImageProps {
  src: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

/** Si une variante Strapi (medium_/large_/xlarge_/…) 404, retombe sur le fichier original. */
function fallbackOriginalMediaSrc(src: string): string | null {
  const next = src.replace(/\/(thumbnail|x?small|medium|x?large)_/i, '/');
  return next !== src ? next : null;
}

export function ArticleImage({
  src,
  alt,
  className,
  fill = true,
  priority = false,
  sizes,
  quality,
}: ArticleImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setFailed(false);
  }, [src]);

  if (!currentSrc || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-primary/10',
          fill && 'absolute inset-0',
          className
        )}
        aria-hidden={!alt}
      >
        <span className="font-display text-4xl font-bold text-primary/20">W</span>
      </div>
    );
  }

  const unoptimized = shouldBypassNextImageOptimization(currentSrc);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill={fill}
      className={className}
      priority={priority}
      sizes={sizes}
      quality={quality ?? imageQualityForPriority(priority)}
      unoptimized={unoptimized}
      onError={() => {
        const fallback = fallbackOriginalMediaSrc(currentSrc);
        if (fallback) {
          setCurrentSrc(fallback);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
