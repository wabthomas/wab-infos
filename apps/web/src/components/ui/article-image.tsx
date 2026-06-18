import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ArticleImageProps {
  src: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}

export function ArticleImage({
  src,
  alt,
  className,
  fill = true,
  priority = false,
  sizes,
}: ArticleImageProps) {
  if (!src) {
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

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  );
}
