import wpRedirects from '@/data/wp-redirects.json';
import { isValidCategorySlug } from '@/config/site';

/** Anciennes rubriques WordPress → rubrique Next.js */
export const LEGACY_CATEGORY_REDIRECTS: Record<string, string> = {
  sante: '/societe',
  'infos-sport': '/sports',
  actusports: '/sports',
  sport: '/sports',
  'actualite-politique': '/politique',
  'actualites-politique': '/politique',
  'politique-rdc': '/politique',
  rdc: '/actualites-rdc',
  congo: '/actualites-rdc',
  urgent: '/actualite',
  flash: '/actualite',
  'economie-finance': '/economie',
  finance: '/economie',
  tech: '/technologies',
  technologie: '/technologies',
  international: '/international',
  societe: '/societe',
  securite: '/securite',
  culture: '/societe',
  people: '/societe',
};

type WpRedirectsData = {
  paths?: Record<string, string>;
  slugs?: Record<string, string>;
};

const data = wpRedirects as WpRedirectsData;

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/$/, '');
  return trimmed || '/';
}

/** Résout une ancienne URL WordPress vers la nouvelle URL (301). */
export function resolveWpRedirect(pathname: string): string | null {
  const normalized = normalizePathname(pathname);
  if (normalized === '/') return null;

  const exact = data.paths?.[normalized];
  if (exact && exact !== normalized) return exact;

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  if (segments.length === 1 && isValidCategorySlug(segments[0])) {
    return null;
  }

  if (segments.length === 1) {
    const legacyCategory = LEGACY_CATEGORY_REDIRECTS[segments[0]];
    if (legacyCategory) return legacyCategory;

    const byRootSlug = data.slugs?.[segments[0]];
    if (byRootSlug && byRootSlug !== normalized) return byRootSlug;

    return null;
  }

  const lastSlug = segments[segments.length - 1];
  const bySlug = data.slugs?.[lastSlug];
  if (bySlug && normalized !== bySlug) return bySlug;

  if (segments.length === 2) {
    const legacyPrefix = LEGACY_CATEGORY_REDIRECTS[segments[0]];
    if (legacyPrefix && !data.slugs?.[segments[1]]) {
      return legacyPrefix;
    }
  }

  return null;
}
