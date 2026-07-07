import 'server-only';

import { unstable_cache } from 'next/cache';
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
  type SiteSettings,
} from '@wab-infos/shared';

const STRAPI_URL =
  process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (STRAPI_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  }
  return headers;
}

async function fetchSiteSettingsFromStrapi(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/site-setting`, {
      headers: getHeaders(),
      next: { revalidate: 60, tags: ['site-settings'] },
    });
    if (res.status === 404) return { ...DEFAULT_SITE_SETTINGS };
    if (!res.ok) return { ...DEFAULT_SITE_SETTINGS };
    const json = (await res.json()) as { data?: unknown };
    return normalizeSiteSettings(json.data);
  } catch {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const cached = unstable_cache(fetchSiteSettingsFromStrapi, ['site-settings'], {
    revalidate: 60,
    tags: ['site-settings'],
  });
  return cached();
}

export function getVisibleSocialLinks(settings: SiteSettings) {
  return settings.socialLinks.filter((link) => link.visible);
}
