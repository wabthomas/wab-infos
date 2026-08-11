/** Réglages SEO globaux du site (stockés dans site-settings / chrome.seo). */

export interface SiteSeoSettings {
  /** Ex. `%title% %sep% %sitename%` */
  titleTemplate: string;
  metaDescriptionTemplate: string;
  separator: string;
  organizationName: string;
  twitterHandle: string;
  facebookPageUrl: string;
  defaultOgImageUrl: string;
  /** Active IndexNow à la publication / via le wizard. */
  indexNowEnabled: boolean;
  /** Active Google Indexing API (service account) à la publication / wizard. */
  googleIndexingEnabled: boolean;
  /** noindex global d’urgence (maintenance). */
  noindexSite: boolean;
  googleNewsPublication: string;
}

export const DEFAULT_SITE_SEO: SiteSeoSettings = {
  titleTemplate: '%title% %sep% %sitename%',
  metaDescriptionTemplate: '%excerpt%',
  separator: '—',
  organizationName: 'Wab-infos',
  twitterHandle: '@wabinfos',
  facebookPageUrl: 'https://facebook.com/wabinfos',
  defaultOgImageUrl: '',
  indexNowEnabled: true,
  googleIndexingEnabled: true,
  noindexSite: false,
  googleNewsPublication: 'Wab-infos',
};

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeSiteSeoSettings(raw: unknown): SiteSeoSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SITE_SEO };
  }
  const row = raw as Record<string, unknown>;
  return {
    titleTemplate: asString(row.titleTemplate, DEFAULT_SITE_SEO.titleTemplate).slice(0, 120),
    metaDescriptionTemplate: asString(
      row.metaDescriptionTemplate,
      DEFAULT_SITE_SEO.metaDescriptionTemplate
    ).slice(0, 200),
    separator: asString(row.separator, DEFAULT_SITE_SEO.separator).slice(0, 8) || '—',
    organizationName: asString(row.organizationName, DEFAULT_SITE_SEO.organizationName).slice(
      0,
      80
    ),
    twitterHandle: asString(row.twitterHandle, DEFAULT_SITE_SEO.twitterHandle).slice(0, 40),
    facebookPageUrl: asString(row.facebookPageUrl, DEFAULT_SITE_SEO.facebookPageUrl).slice(0, 200),
    defaultOgImageUrl: asString(row.defaultOgImageUrl, '').slice(0, 500),
    indexNowEnabled: asBool(row.indexNowEnabled, true),
    googleIndexingEnabled: asBool(row.googleIndexingEnabled, true),
    noindexSite: asBool(row.noindexSite, false),
    googleNewsPublication: asString(
      row.googleNewsPublication,
      DEFAULT_SITE_SEO.googleNewsPublication
    ).slice(0, 80),
  };
}

export function applySeoTemplate(
  template: string,
  vars: Record<string, string>,
  separator = '—'
): string {
  let out = template;
  const map = { ...vars, sep: separator, separator };
  for (const [key, value] of Object.entries(map)) {
    out = out.split(`%${key}%`).join(value ?? '');
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}
