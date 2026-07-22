import {
  DEFAULT_HOMEPAGE_SECTIONS,
  normalizeHomepageSections,
  type HomepageSection,
} from './homepage-sections';
import {
  DEFAULT_SITE_CHROME,
  normalizeSiteChromeSettings,
  type SiteChromeSettings,
} from './site-chrome-settings';

export type {
  SiteChromeSettings,
  SiteFooterCta,
  SiteNavLink,
} from './site-chrome-settings';
export {
  DEFAULT_FOOTER_CTA,
  DEFAULT_FOOTER_LEGAL_LINKS,
  DEFAULT_INFO_LINKS,
  DEFAULT_SERVICE_LINKS,
  DEFAULT_SITE_CHROME,
  DEFAULT_UTILITY_LINKS,
  getVisibleNavLinks,
  normalizeSiteChromeSettings,
} from './site-chrome-settings';

export type { HomepageSection, HomepageSectionLayoutTheme, HomepageSectionType, HomepageSectionZone } from './homepage-sections';
export {
  BOTTOM_HOMEPAGE_LAYOUT_THEMES,
  createHomepageSection,
  createVideoHomepageSection,
  DEFAULT_HOMEPAGE_SECTIONS,
  getActiveHomepageSections,
  getEnabledHomepageCategorySlugs,
  getHomepageSectionLabel,
  HOMEPAGE_LAYOUT_THEME_LABELS,
  normalizeHomepageSection,
  normalizeHomepageSections,
  TOP_HOMEPAGE_LAYOUT_THEMES,
  VIDEO_HOMEPAGE_LAYOUT_THEMES,
} from './homepage-sections';

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
  homepageSections: HomepageSection[];
  chrome: SiteChromeSettings;
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
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
  chrome: DEFAULT_SITE_CHROME,
};

export const SITE_SETTINGS_EMBEDDED_VERSION = 2;

/** Stockage de secours dans le champ JSON `socialLinks` (Strapi sans colonnes dédiées). */
export interface SiteSettingsEmbeddedInSocialLinks {
  v: typeof SITE_SETTINGS_EMBEDDED_VERSION;
  links: SiteSocialLink[];
  homepageSections: HomepageSection[];
  chrome: SiteChromeSettings;
}

const PLATFORMS = new Set<SocialFollowPlatform>([
  'whatsapp',
  'facebook',
  'x',
  'youtube',
  'tiktok',
]);

export function isEmbeddedSocialLinksStorage(
  raw: unknown
): raw is SiteSettingsEmbeddedInSocialLinks {
  return (
    raw !== null &&
    typeof raw === 'object' &&
    (raw as SiteSettingsEmbeddedInSocialLinks).v === SITE_SETTINGS_EMBEDDED_VERSION &&
    Array.isArray((raw as SiteSettingsEmbeddedInSocialLinks).links)
  );
}

function normalizeSocialLinksList(raw: unknown): SiteSocialLink[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map(normalizeSiteSocialLink)
    .filter((link): link is SiteSocialLink => link != null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function unpackSocialLinksStorage(raw: unknown): {
  socialLinks: SiteSocialLink[];
  homepageSections?: HomepageSection[];
  chrome?: SiteChromeSettings;
} {
  if (Array.isArray(raw)) {
    return { socialLinks: normalizeSocialLinksList(raw) };
  }

  if (isEmbeddedSocialLinksStorage(raw)) {
    return {
      socialLinks: normalizeSocialLinksList(raw.links),
      homepageSections: normalizeHomepageSections(raw.homepageSections),
      chrome: normalizeSiteChromeSettings(raw.chrome),
    };
  }

  return { socialLinks: [] };
}

export function packSocialLinksStorage(settings: SiteSettings): SiteSettingsEmbeddedInSocialLinks {
  return {
    v: SITE_SETTINGS_EMBEDDED_VERSION,
    links: settings.socialLinks,
    homepageSections: settings.homepageSections,
    chrome: settings.chrome,
  };
}

export function strapiSupportsDedicatedLayoutFields(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  return 'homepageSections' in row && 'chrome' in row;
}

export function buildStrapiSiteSettingsPayload(
  settings: SiteSettings,
  existingRow: Record<string, unknown> | null
): Record<string, unknown> {
  const base = {
    pwaBannerEnabled: settings.pwaBannerEnabled,
    pwaBannerVisible: settings.pwaBannerVisible,
    apkBannerEnabled: settings.apkBannerEnabled,
    apkBannerVisible: settings.apkBannerVisible,
    showArticleViewCounts: settings.showArticleViewCounts,
  };

  if (strapiSupportsDedicatedLayoutFields(existingRow)) {
    return {
      ...base,
      socialLinks: settings.socialLinks,
      homepageSections: settings.homepageSections,
      chrome: settings.chrome,
    };
  }

  return {
    ...base,
    socialLinks: packSocialLinksStorage(settings),
  };
}

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
  const unpacked = unpackSocialLinksStorage(row.socialLinks);

  const socialLinks =
    unpacked.socialLinks.length > 0 ? unpacked.socialLinks : [...DEFAULT_SITE_SOCIAL_LINKS];

  return {
    pwaBannerEnabled: row.pwaBannerEnabled !== false,
    pwaBannerVisible: row.pwaBannerVisible !== false,
    apkBannerEnabled: row.apkBannerEnabled !== false,
    apkBannerVisible: row.apkBannerVisible !== false,
    showArticleViewCounts: row.showArticleViewCounts !== false,
    socialLinks,
    homepageSections: normalizeHomepageSections(
      row.homepageSections ?? unpacked.homepageSections
    ),
    chrome: normalizeSiteChromeSettings(row.chrome ?? row.siteChrome ?? unpacked.chrome),
  };
}
