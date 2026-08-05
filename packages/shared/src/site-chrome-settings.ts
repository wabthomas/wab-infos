import { normalizeArticleUiSettings, type ArticleUiSettings } from './article-ui-settings';
import {
  normalizeBrandingSettings,
  type SiteBrandingSettings,
} from './site-branding-settings';
import {
  normalizeTypographySettings,
  type SiteTypographySettings,
} from './site-typography-settings';

export interface SiteNavLink {
  id: string;
  label: string;
  href: string;
  description?: string;
  visible: boolean;
  sortOrder: number;
}

export interface SiteFooterCta {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

/** Pied du menu latéral mobile (sous les rubriques). */
export type MobileMenuFooterAction = 'none' | 'tv' | 'play_store';

export interface SiteChromeSettings {
  headerUtilityBarEnabled: boolean;
  headerTvButtonEnabled: boolean;
  headerPushAlertsEnabled: boolean;
  headerSearchEnabled: boolean;
  /** Loupe dans la barre du haut (mobile). */
  mobileHeaderSearchEnabled: boolean;
  /** Champ recherche dans le panneau menu (mobile). */
  mobileMenuSearchEnabled: boolean;
  /** Bouton bas de menu : TV, Play Store ou masqué. */
  mobileMenuFooterAction: MobileMenuFooterAction;
  /** Lien Play Store (si mobileMenuFooterAction = play_store). */
  mobileMenuPlayStoreUrl: string;
  /** Afficher « App vX.Y.Z » en bas du menu mobile. */
  mobileMenuShowAppVersion: boolean;
  headerThemeToggleEnabled: boolean;
  headerAuthLinkEnabled: boolean;
  footerEnabled: boolean;
  footerSocialFromSettings: boolean;
  footerCta: SiteFooterCta;
  breakingTickerEnabled: boolean;
  newsletterWidgetEnabled: boolean;
  pushAlertsWidgetEnabled: boolean;
  mobileBottomNavEnabled: boolean;
  adsGloballyEnabled: boolean;
  /** Slugs ordonnés ; vide = ordre par défaut de site.ts */
  navCategorySlugs: string[];
  utilityLinks: SiteNavLink[];
  serviceLinks: SiteNavLink[];
  infoLinks: SiteNavLink[];
  footerLegalLinks: SiteNavLink[];
  /** Affichage sidebar / commentaires article (desktop & mobile) */
  articleUi: ArticleUiSettings;
  /** Polices du site public (UI, titres, article, citations) */
  typography: SiteTypographySettings;
  /** Logo + nom affiché dans l’en-tête / pied de page */
  branding: SiteBrandingSettings;
}

export const DEFAULT_UTILITY_LINKS: SiteNavLink[] = [
  { id: 'tv', label: 'Wab-infos TV', href: '/tv', visible: true, sortOrder: 0 },
  { id: 'newsletter', label: 'Newsletter', href: '/#newsletter', visible: true, sortOrder: 1 },
  { id: 'contact', label: 'Contact', href: '/contact', visible: true, sortOrder: 2 },
];

export const DEFAULT_SERVICE_LINKS: SiteNavLink[] = [
  {
    id: 'tv',
    label: 'Wab-infos TV',
    href: '/tv',
    description: 'Direct & replays',
    visible: true,
    sortOrder: 0,
  },
  {
    id: 'search',
    label: 'Recherche avancée',
    href: '/recherche',
    description: 'Tous les articles',
    visible: true,
    sortOrder: 1,
  },
  {
    id: 'rss',
    label: 'Flux RSS',
    href: '/feed.xml',
    description: "Suivre l'actualité",
    visible: true,
    sortOrder: 2,
  },
];

export const DEFAULT_INFO_LINKS: SiteNavLink[] = [
  { id: 'about', label: 'À propos', href: '/a-propos', visible: true, sortOrder: 0 },
  { id: 'contact', label: 'Contact', href: '/contact', visible: true, sortOrder: 1 },
  { id: 'legal', label: 'Mentions légales', href: '/mentions-legales', visible: true, sortOrder: 2 },
];

export const DEFAULT_FOOTER_LEGAL_LINKS: SiteNavLink[] = [
  { id: 'about', label: 'À propos', href: '/a-propos', visible: true, sortOrder: 0 },
  { id: 'contact', label: 'Contact', href: '/contact', visible: true, sortOrder: 1 },
  { id: 'legal', label: 'Mentions légales', href: '/mentions-legales', visible: true, sortOrder: 2 },
  {
    id: 'privacy',
    label: 'Confidentialité',
    href: '/politique-confidentialite',
    visible: true,
    sortOrder: 3,
  },
];

export const DEFAULT_FOOTER_CTA: SiteFooterCta = {
  enabled: true,
  eyebrow: 'Restez informé',
  title: "L'actualité RDC & Afrique, chaque jour",
  subtitle: 'Newsletter, Wab-infos TV et flux RSS pour ne rien manquer.',
  primaryLabel: 'Newsletter',
  primaryHref: '/#newsletter',
  secondaryLabel: 'Wab-infos TV',
  secondaryHref: '/tv',
};

export const DEFAULT_SITE_CHROME: SiteChromeSettings = {
  headerUtilityBarEnabled: true,
  headerTvButtonEnabled: true,
  headerPushAlertsEnabled: true,
  headerSearchEnabled: true,
  mobileHeaderSearchEnabled: true,
  mobileMenuSearchEnabled: false,
  mobileMenuFooterAction: 'play_store',
  mobileMenuPlayStoreUrl:
    'https://play.google.com/store/apps/details?id=com.wabinfos.app',
  mobileMenuShowAppVersion: true,
  headerThemeToggleEnabled: true,
  headerAuthLinkEnabled: true,
  footerEnabled: true,
  footerSocialFromSettings: true,
  footerCta: DEFAULT_FOOTER_CTA,
  breakingTickerEnabled: true,
  newsletterWidgetEnabled: true,
  pushAlertsWidgetEnabled: true,
  mobileBottomNavEnabled: true,
  adsGloballyEnabled: true,
  navCategorySlugs: [],
  utilityLinks: DEFAULT_UTILITY_LINKS,
  serviceLinks: DEFAULT_SERVICE_LINKS,
  infoLinks: DEFAULT_INFO_LINKS,
  footerLegalLinks: DEFAULT_FOOTER_LEGAL_LINKS,
  articleUi: normalizeArticleUiSettings(undefined),
  typography: normalizeTypographySettings(undefined),
  branding: normalizeBrandingSettings(undefined),
};

function normalizeNavLink(raw: unknown, fallbackId: string): SiteNavLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  const href = typeof row.href === 'string' ? row.href.trim() : '';
  if (!label || !href) return null;
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : fallbackId,
    label,
    href,
    description: typeof row.description === 'string' ? row.description.trim() : undefined,
    visible: row.visible !== false,
    sortOrder:
      typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder) ? row.sortOrder : 0,
  };
}

function normalizeNavLinks(raw: unknown, defaults: SiteNavLink[]): SiteNavLink[] {
  if (!Array.isArray(raw)) return defaults.map((link) => ({ ...link }));
  const links = raw
    .map((item, index) => normalizeNavLink(item, `link-${index}`))
    .filter((link): link is SiteNavLink => link != null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return links.length > 0 ? links : defaults.map((link) => ({ ...link }));
}

function normalizeMobileMenuFooterAction(raw: unknown): MobileMenuFooterAction {
  if (raw === 'none' || raw === 'tv' || raw === 'play_store') return raw;
  return DEFAULT_SITE_CHROME.mobileMenuFooterAction;
}

function normalizeFooterCta(raw: unknown): SiteFooterCta {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FOOTER_CTA };
  const row = raw as Record<string, unknown>;
  const pick = (key: keyof SiteFooterCta, fallback: string) =>
    typeof row[key] === 'string' && row[key].trim() ? String(row[key]).trim() : fallback;
  return {
    enabled: row.enabled !== false,
    eyebrow: pick('eyebrow', DEFAULT_FOOTER_CTA.eyebrow),
    title: pick('title', DEFAULT_FOOTER_CTA.title),
    subtitle: pick('subtitle', DEFAULT_FOOTER_CTA.subtitle),
    primaryLabel: pick('primaryLabel', DEFAULT_FOOTER_CTA.primaryLabel),
    primaryHref: pick('primaryHref', DEFAULT_FOOTER_CTA.primaryHref),
    secondaryLabel: pick('secondaryLabel', DEFAULT_FOOTER_CTA.secondaryLabel),
    secondaryHref: pick('secondaryHref', DEFAULT_FOOTER_CTA.secondaryHref),
  };
}

export function normalizeSiteChromeSettings(raw: unknown): SiteChromeSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SITE_CHROME,
      footerCta: { ...DEFAULT_FOOTER_CTA },
      articleUi: normalizeArticleUiSettings(undefined),
      typography: normalizeTypographySettings(undefined),
      branding: normalizeBrandingSettings(undefined),
    };
  }
  const row = raw as Record<string, unknown>;
  const navCategorySlugs = Array.isArray(row.navCategorySlugs)
    ? row.navCategorySlugs
        .filter((slug): slug is string => typeof slug === 'string' && slug.trim().length > 0)
        .map((slug) => slug.trim())
    : [];

  return {
    headerUtilityBarEnabled: row.headerUtilityBarEnabled !== false,
    headerTvButtonEnabled: row.headerTvButtonEnabled !== false,
    headerPushAlertsEnabled: row.headerPushAlertsEnabled !== false,
    headerSearchEnabled: row.headerSearchEnabled !== false,
    mobileHeaderSearchEnabled:
      row.mobileHeaderSearchEnabled !== undefined
        ? row.mobileHeaderSearchEnabled !== false
        : DEFAULT_SITE_CHROME.mobileHeaderSearchEnabled,
    mobileMenuSearchEnabled:
      row.mobileMenuSearchEnabled !== undefined
        ? row.mobileMenuSearchEnabled !== false
        : DEFAULT_SITE_CHROME.mobileMenuSearchEnabled,
    mobileMenuFooterAction: normalizeMobileMenuFooterAction(row.mobileMenuFooterAction),
    mobileMenuPlayStoreUrl:
      typeof row.mobileMenuPlayStoreUrl === 'string' && row.mobileMenuPlayStoreUrl.trim()
        ? row.mobileMenuPlayStoreUrl.trim()
        : DEFAULT_SITE_CHROME.mobileMenuPlayStoreUrl,
    mobileMenuShowAppVersion:
      row.mobileMenuShowAppVersion !== undefined
        ? row.mobileMenuShowAppVersion !== false
        : DEFAULT_SITE_CHROME.mobileMenuShowAppVersion,
    headerThemeToggleEnabled: row.headerThemeToggleEnabled !== false,
    headerAuthLinkEnabled: row.headerAuthLinkEnabled !== false,
    footerEnabled: row.footerEnabled !== false,
    footerSocialFromSettings: row.footerSocialFromSettings !== false,
    footerCta: normalizeFooterCta(row.footerCta),
    breakingTickerEnabled: row.breakingTickerEnabled !== false,
    newsletterWidgetEnabled: row.newsletterWidgetEnabled !== false,
    pushAlertsWidgetEnabled: row.pushAlertsWidgetEnabled !== false,
    mobileBottomNavEnabled: row.mobileBottomNavEnabled !== false,
    adsGloballyEnabled: row.adsGloballyEnabled !== false,
    navCategorySlugs,
    utilityLinks: normalizeNavLinks(row.utilityLinks, DEFAULT_UTILITY_LINKS),
    serviceLinks: normalizeNavLinks(row.serviceLinks, DEFAULT_SERVICE_LINKS),
    infoLinks: normalizeNavLinks(row.infoLinks, DEFAULT_INFO_LINKS),
    footerLegalLinks: normalizeNavLinks(row.footerLegalLinks, DEFAULT_FOOTER_LEGAL_LINKS),
    articleUi: normalizeArticleUiSettings(row.articleUi),
    typography: normalizeTypographySettings(row.typography),
    branding: normalizeBrandingSettings(row.branding),
  };
}

export function getVisibleNavLinks(links: readonly SiteNavLink[]): SiteNavLink[] {
  return [...links].filter((link) => link.visible).sort((a, b) => a.sortOrder - b.sortOrder);
}
