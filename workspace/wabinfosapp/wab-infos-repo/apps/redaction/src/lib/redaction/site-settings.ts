import qs from 'qs';
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
  type SiteSettings,
} from '@wab-infos/shared';
import { RedactionAuthError, isRedactionSuperAdmin } from '@/lib/redaction/strapi-editor';
import type { RedactionUser } from '@/lib/redaction/types';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

function getStrapiUrl(): string {
  return process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
}

function apiTokenHeaders(): HeadersInit {
  if (!STRAPI_TOKEN) {
    throw new Error('STRAPI_API_TOKEN manquant pour l’espace rédaction');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_TOKEN}`,
  };
}

async function strapiSettingsFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${getStrapiUrl()}/api${path}`, {
    ...options,
    headers: { ...apiTokenHeaders(), ...options?.headers },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Strapi ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Réponse Strapi invalide: ${text.slice(0, 120)}`);
  }
}

export async function getEditorSiteSettings(): Promise<SiteSettings> {
  try {
    const response = await strapiSettingsFetch<{ data?: unknown }>('/site-setting');
    return normalizeSiteSettings(response.data);
  } catch {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export async function updateEditorSiteSettings(
  user: RedactionUser,
  payload: SiteSettings
): Promise<SiteSettings> {
  if (!isRedactionSuperAdmin(user)) {
    throw new RedactionAuthError('Accès réservé aux super administrateurs');
  }

  const data = normalizeSiteSettings(payload);
  const response = await strapiSettingsFetch<{ data?: unknown }>('/site-setting', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
  return normalizeSiteSettings(response.data ?? data);
}
