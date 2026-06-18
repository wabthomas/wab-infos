const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com';

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
  youtubeChannelId: process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || '',
  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
} as const;

export const categories = [
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
