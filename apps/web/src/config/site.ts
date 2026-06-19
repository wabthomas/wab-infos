const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.wab-infos.com';

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Wab-infos',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'Actualités RDC, politique, économie, sports et international. Wab-infos, votre source d\'information fiable.',
  url: SITE_URL,
  ogImage: `${SITE_URL}/og-default.jpg`,
  locale: 'fr_FR',
  language: 'fr',
  twitter: '@wabinfos',
  publisher: 'Wab-infos',
  googleNewsPublication: process.env.NEXT_PUBLIC_GOOGLE_NEWS_PUBLICATION || 'wab-infos',
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '',
  youtubeChannelUrl:
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || 'https://youtube.com/@wabinfostv',
  youtubeChannelHandle:
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_HANDLE || 'wabinfostv',
  youtubeChannelId:
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || 'UCjAepna3JBGPfzUBJRoKbCw',
  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
} as const;

export const categories = [
  { name: 'Actualité', slug: 'actualite', color: '#E63946' },
  { name: 'Actualités RDC', slug: 'actualites-rdc', color: '#E63946' },
  { name: 'Politique', slug: 'politique', color: '#1D3557' },
  { name: 'Économie', slug: 'economie', color: '#2A9D8F' },
  { name: 'Sécurité', slug: 'securite', color: '#E76F51' },
  { name: 'Société', slug: 'societe', color: '#F4A261' },
  { name: 'Sports', slug: 'sports', color: '#264653' },
  { name: 'International', slug: 'international', color: '#457B9D' },
  { name: 'Technologies', slug: 'technologies', color: '#6C63FF' },
  { name: 'Wab-infos TV', slug: 'wab-infos-tv', color: '#D62828' },
] as const;

export type CategorySlug = (typeof categories)[number]['slug'];

const categorySlugSet = new Set<string>(categories.map((c) => c.slug));

export function isValidCategorySlug(slug: string): slug is CategorySlug {
  return categorySlugSet.has(slug);
}

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

/** URL relative d'un article */
export function getArticlePath(
  article: { slug: string; category?: { slug?: string } },
  urlCategory?: string
): string {
  return `/${resolveArticleCategorySlug(article, urlCategory)}/${article.slug}`;
}

/** Slug de rubrique pour les URLs article (données Strapi > segment URL > défaut) */
export function resolveArticleCategorySlug(
  article: { category?: { slug?: string } },
  urlCategory?: string
): string {
  return article.category?.slug ?? urlCategory ?? 'actualite';
}

/** URL absolue d'une page vidéo sur le site */
export function getVideoPagePath(youtubeId: string): string {
  return `/tv/v/${youtubeId}`;
}

/** Rubrique connue ou repli depuis les données Strapi / l'URL (pages article uniquement) */
export function resolveCategoryMeta(
  slug: string,
  fallback?: { name?: string; color?: string }
) {
  const found = categories.find((c) => c.slug === slug);
  if (found) return found;

  return {
    name:
      fallback?.name ??
      slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    slug,
    color: fallback?.color ?? '#E63946',
  };
}
