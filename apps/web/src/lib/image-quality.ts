/**
 * Qualités autorisées pour `next/image` (Next.js 16+).
 * Toute valeur absente de `images.qualities` dans next.config.ts provoque un 400 sur /_next/image.
 * Garder cette liste synchronisée avec next.config.ts.
 */
export const NEXT_IMAGE_QUALITIES = [75, 90] as const;

export type NextImageQuality = (typeof NEXT_IMAGE_QUALITIES)[number];

/** Cartes, listes, images dans le corps d'article */
export const IMAGE_QUALITY_DEFAULT: NextImageQuality = 75;

/** Hero article, image à la une, avatars — chargement prioritaire */
export const IMAGE_QUALITY_LCP: NextImageQuality = 90;

export function imageQualityForPriority(priority: boolean): NextImageQuality {
  return priority ? IMAGE_QUALITY_LCP : IMAGE_QUALITY_DEFAULT;
}
