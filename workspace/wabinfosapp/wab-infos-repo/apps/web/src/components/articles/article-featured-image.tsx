import { ArticleImage } from '@/components/ui/article-image';
import type { StrapiMedia } from '@wab-infos/shared';
import { cn } from '@/lib/utils';

interface ArticleFeaturedImageProps {
  src: string | null;
  alt: string;
  caption?: string | null;
  credit?: string | null;
  className?: string;
}

export function getFeaturedImageCaption(image?: StrapiMedia): string | null {
  if (!image) return null;

  const caption = image.caption?.trim() || image.alternativeText?.trim();
  if (!caption) return null;

  // Éviter d'afficher un slug technique comme légende (données mock)
  if (/^[\w-]+$/.test(caption) && caption.includes('-') && caption.length > 20) {
    return null;
  }

  return caption;
}

export function ArticleFeaturedImage({
  src,
  alt,
  caption,
  credit,
  className,
}: ArticleFeaturedImageProps) {
  const hasCaption = Boolean(caption || credit);

  return (
    <figure className={cn('mb-6', className)}>
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <div className="relative aspect-[3/2] max-h-[min(42vw,320px)] w-full">
          <ArticleImage
            src={src}
            alt={alt}
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 576px"
          />
        </div>
      </div>

      {hasCaption && (
        <figcaption className="mx-auto mt-2.5 max-w-xl border-l-2 border-primary/50 pl-3">
          {caption && (
            <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
          )}
          {credit && (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
              {credit}
            </p>
          )}
        </figcaption>
      )}
    </figure>
  );
}
