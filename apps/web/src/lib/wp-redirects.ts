import wpRedirects from '@/data/wp-redirects.json';
import manualRedirects from '@/data/wp-redirects-manual.json';
import { isValidCategorySlug } from '@/config/site';

/**
 * Anciennes rubriques WordPress → rubrique Next.js.
 * Ne jamais y mettre un slug de rubrique actuelle (securite, societe, etc.) :
 * sinon `/rubrique/{article}` non mappé redirige à tort vers la rubrique.
 */
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
  culture: '/societe',
  people: '/societe',
};

type WpRedirectsData = {
  paths?: Record<string, string>;
  slugs?: Record<string, string>;
};

/** Articles WordPress supprimés/non migrés : préfixes → rubrique de repli */
const DELETED_SLUG_PREFIX_FALLBACKS: { prefix: string; target: string }[] = [
  { prefix: 'urgent-', target: '/actualite' },
  { prefix: 'flash-', target: '/actualite' },
];

const data = wpRedirects as WpRedirectsData;
const manual = manualRedirects as WpRedirectsData;

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/$/, '');
  return trimmed || '/';
}

/** Résout une ancienne URL WordPress vers la nouvelle URL (301). */
export function resolveWpRedirect(pathname: string): string | null {
  const normalized = normalizePathname(pathname);
  if (normalized === '/') return null;

  const manualExact = manual.paths?.[normalized];
  if (manualExact && manualExact !== normalized) return manualExact;

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

    for (const { prefix, target } of DELETED_SLUG_PREFIX_FALLBACKS) {
      if (segments[0].startsWith(prefix) && segments[0].length > prefix.length + 8) {
        return target;
      }
    }

    return null;
  }

  const lastSlug = segments[segments.length - 1];
  const bySlug = data.slugs?.[lastSlug];
  if (bySlug && normalized !== bySlug) return bySlug;

  // Repli 2 segments : anciens préfixes WP (ex. /sport/foo → /sports/foo).
  // Toujours conserver le slug article — ne jamais renvoyer seulement la rubrique
  // (sinon l’article est inaccessible et « Lire aussi » / similaires n’apparaissent jamais).
  // Jamais pour une rubrique actuelle (/securite/foo doit atteindre la page article).
  if (segments.length === 2 && !isValidCategorySlug(segments[0])) {
    const legacyPrefix = LEGACY_CATEGORY_REDIRECTS[segments[0]];
    if (legacyPrefix && !data.slugs?.[segments[1]]) {
      return `${legacyPrefix}/${segments[1]}`;
    }
  }

  return null;
}
