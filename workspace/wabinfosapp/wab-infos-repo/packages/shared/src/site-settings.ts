export type SocialFollowPlatform = 'whatsapp' | 'facebook' | 'x' | 'youtube' | 'tiktok';

export interface SiteSocialLink {
  id: SocialFollowPlatform;
  label: string;
  href: string;
  handle: string;
  brandColor: string;
  /** Compteur manuel (null = récupération auto / env). */
  followers: number | null;
  visible: boolean;
  sortOrder: number;
}

export interface SiteSettings {
  pwaBannerEnabled: boolean;
  pwaBannerVisible: boolean;
  apkBannerEnabled: boolean;
  apkBannerVisible: boolean;
  showArticleViewCounts: boolean;
  socialLinks: SiteSocialLink[];
}

export const DEFAULT_SITE_SOCIAL_LINKS: SiteSocialLink[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://whatsapp.com/channel/0029VaD4Z9a1CYobJ2TWBD07',
    handle: 'Canal Wab-infos',
    brandColor: '#25D366',
    followers: null,
    visible: true,
    sortOrder: 0,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://facebook.com/wabinfos',
    handle: '@wabinfos',
    brandColor: '#1877F2',
    followers: null,
    visible: true,
    sortOrder: 1,
  },
  {
    id: 'x',
    label: 'X',
    href: 'https://x.com/wabinfos',
    handle: '@wabinfos',
    brandColor: '#0f0f0f',
    followers: null,
    visible: true,
    sortOrder: 2,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    href: 'https://youtube.com/@wabinfostv',
    handle: '@wabinfostv',
    brandColor: '#FF0000',
    followers: null,
    visible: true,
    sortOrder: 3,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: 'https://tiktok.com/@wabinfostv',
    handle: '@wabinfostv',
    brandColor: '#010101',
    followers: null,
    visible: true,
    sortOrder: 4,
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  pwaBannerEnabled: true,
  pwaBannerVisible: true,
  apkBannerEnabled: true,
  apkBannerVisible: true,
  showArticleViewCounts: true,
  socialLinks: DEFAULT_SITE_SOCIAL_LINKS,
};

const PLATFORMS = new Set<SocialFollowPlatform>([
  'whatsapp',
  'facebook',
  'x',
  'youtube',
  'tiktok',
]);

export function normalizeSiteSocialLink(raw: unknown): SiteSocialLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = row.id as SocialFollowPlatform;
  if (!PLATFORMS.has(id)) return null;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  const href = typeof row.href === 'string' ? row.href.trim() : '';
  if (!label || !href) return null;
  const followersRaw = row.followers;
  const followers =
    followersRaw == null || followersRaw === ''
      ? null
      : typeof followersRaw === 'number' && Number.isFinite(followersRaw)
        ? Math.max(0, Math.floor(followersRaw))
        : null;
  return {
    id,
    label,
    href,
    handle: typeof row.handle === 'string' ? row.handle.trim() : '',
    brandColor:
      typeof row.brandColor === 'string' && row.brandColor.trim()
        ? row.brandColor.trim()
        : '#111111',
    followers,
    visible: row.visible !== false,
    sortOrder:
      typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder)
        ? row.sortOrder
        : 0,
  };
}

export function normalizeSiteSettings(raw: unknown): SiteSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SITE_SETTINGS };
  const row = raw as Record<string, unknown>;
  const socialRaw = Array.isArray(row.socialLinks) ? row.socialLinks : [];
  const socialLinks = socialRaw
    .map(normalizeSiteSocialLink)
    .filter((link): link is SiteSocialLink => link != null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    pwaBannerEnabled: row.pwaBannerEnabled !== false,
    pwaBannerVisible: row.pwaBannerVisible !== false,
    apkBannerEnabled: row.apkBannerEnabled !== false,
    apkBannerVisible: row.apkBannerVisible !== false,
    showArticleViewCounts: row.showArticleViewCounts !== false,
    socialLinks: socialLinks.length > 0 ? socialLinks : [...DEFAULT_SITE_SOCIAL_LINKS],
  };
}
