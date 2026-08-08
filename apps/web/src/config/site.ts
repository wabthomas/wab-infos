const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com';

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Wab-infos',
  tagline: "S'informer pour mieux s'armer !",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'Actualités RDC, politique, économie, sports et international. Wab-infos, votre source d\'information fiable.',
  url: SITE_URL,
  ogImage: `${SITE_URL}/opengraph-image.png`,
  locale: 'fr_FR',
  language: 'fr',
  twitter: process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@wabinfos',
  publisher: 'Wab-infos',
  googleNewsPublication:
    process.env.NEXT_PUBLIC_GOOGLE_NEWS_PUBLICATION || 'Wab-infos',
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '',
  adsenseSlots: {
    header: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER || '',
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
    articleTop: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_TOP || '',
    articleInContent: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_IN_CONTENT || '',
    articleMid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID || '',
    articleBottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM || '',
    mobileSticky: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_STICKY || '',
  },
  youtubeChannelUrl:
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || 'https://youtube.com/@wabinfostv',
  youtubeChannelHandle:
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_HANDLE || 'wabinfostv',
  youtubeChannelId:
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || 'UCjAepna3JBGPfzUBJRoKbCw',
  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || '',
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  /** Reader Revenue Manager / Subscribe with Google (CMS Sync) */
  swgProductId: process.env.NEXT_PUBLIC_GOOGLE_SWG_PRODUCT_ID || '',
  /** URL de téléchargement APK Android (apps/reader-android release) */
  androidApkUrl: process.env.NEXT_PUBLIC_ANDROID_APK_URL || '/downloads/wab-infos.apk',
  androidApkVersionUrl:
    process.env.NEXT_PUBLIC_ANDROID_APK_VERSION_URL || '/api/apk-version',
  /** Fiche Google Play (menu mobile « Télécharger »). */
  androidPlayStoreUrl:
    process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL ||
    'https://play.google.com/store/apps/details?id=com.wabinfos.app',
  /** Logo rectangulaire Publisher Center / JSON-LD (400×200) — public/publisher-logo.png */
  publisherLogoUrl: `${SITE_URL}/publisher-logo.png`,
} as const;

/** Profils officiels (Knowledge Graph, Organization sameAs) */
export const siteSocialProfiles = [
  'https://facebook.com/wabinfos',
  'https://twitter.com/wabinfos',
  siteConfig.youtubeChannelUrl,
] as const;

/** Mots-clés éditoriaux (meta keywords, pages thématiques) */
export const siteSeoKeywords = [
  'Wab-infos',
  'wab infos',
  'actualités RDC',
  'actualités Congo',
  'actualité Kinshasa',
  'information RDC',
  'journal Congo',
  'média congolais',
  'politique RDC',
  'économie Congo',
  'Afrique centrale',
  'international',
] as const;

/** Informations éditoriales (Google News Publisher Center, pages légales) */
export const editorialConfig = {
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@wab-infos.com',
  redactionEmail: process.env.NEXT_PUBLIC_REDACTION_EMAIL || 'redaction@wab-infos.com',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Kinshasa',
  country: process.env.NEXT_PUBLIC_CONTACT_COUNTRY || 'République Démocratique du Congo',
  foundedYear: process.env.NEXT_PUBLIC_FOUNDED_YEAR || '2010',
} as const;

export const categories = [
  { name: 'Actualité', slug: 'actualite', color: '#E63946' },
  { name: 'Actualités RDC', slug: 'actualites-rdc', color: '#E63946' },
  { name: 'Politique', slug: 'politique', color: '#1D3557' },
  { name: 'Économie', slug: 'economie', color: '#2A9D8F' },
  { name: 'Sécurité', slug: 'securite', color: '#E76F51' },
  { name: 'Société', slug: 'societe', color: '#F4A261' },
  { name: 'Faits divers', slug: 'faits-divers', color: '#9A3412' },
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

/** Page article : /{rubrique}/{slug} */
export function isArticlePagePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 2) return false;
  return isValidCategorySlug(segments[0]);
}

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

/** Anciens slugs WP / variantes → slug canonique du site */
const CATEGORY_SLUG_ALIASES: Record<string, CategorySlug> = {
  sport: 'sports',
  'infos-sport': 'sports',
  actusports: 'sports',
  sante: 'societe',
  culture: 'societe',
  people: 'societe',
  'faitsdivers': 'faits-divers',
  'fait-divers': 'faits-divers',
  insolite: 'faits-divers',
  tech: 'technologies',
  technologie: 'technologies',
  'economie-finance': 'economie',
  finance: 'economie',
  rdc: 'actualites-rdc',
  congo: 'actualites-rdc',
  urgent: 'actualite',
  flash: 'actualite',
  'actualite-politique': 'politique',
  'actualites-politique': 'politique',
  'politique-rdc': 'politique',
};

export function canonicalizeCategorySlug(slug: string): string {
  return CATEGORY_SLUG_ALIASES[slug] ?? slug;
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
  const raw = article.category?.slug ?? urlCategory ?? 'actualite';
  return canonicalizeCategorySlug(raw);
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
