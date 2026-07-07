import type { Article, StrapiMedia } from '@wab-infos/shared';
import { siteConfig } from '@/config/site';

const SITE_ORIGIN = siteConfig.url.replace(/\/$/, '');
const UNSUPPORTED_EXT = /\.(svg)$/i;
/** WhatsApp / Facebook lisent ces formats sans conversion. */
const SOCIAL_SAFE_EXT = /\.(jpe?g|png|gif)$/i;
/** Nécessite le proxy JPEG (/og-image). */
const NEEDS_PROXY_EXT = /\.(webp|avif|heic|heif)$/i;

function firstImageFromHtml(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

/** Extrait un chemin /uploads ou /wp-content depuis toute URL connue du site. */
export function normalizeMediaPathForSite(url?: string): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();

  if (trimmed.startsWith('data:') || trimmed.includes('/_next/image')) {
    if (trimmed.includes('/_next/image')) {
      try {
        const parsed = new URL(trimmed, SITE_ORIGIN);
        const inner = parsed.searchParams.get('url');
        if (inner) return normalizeMediaPathForSite(inner);
      } catch {
        return null;
      }
    }
    return null;
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/wp-content/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/') || trimmed.startsWith('wp-content/')) {
    return `/${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed, SITE_ORIGIN);
    if (
      parsed.pathname.startsWith('/uploads/') ||
      parsed.pathname.startsWith('/wp-content/')
    ) {
      return parsed.pathname;
    }
  } catch {
    return null;
  }

  return null;
}

export function toAbsolutePublicMediaUrl(urlOrPath: string): string {
  const path = normalizeMediaPathForSite(urlOrPath);
  if (path) return `${SITE_ORIGIN}${path}`;
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
  return `${SITE_ORIGIN}/${urlOrPath.replace(/^\//, '')}`;
}

/** URL fiable pour WhatsApp / Facebook. */
export function resolveSocialShareImageUrl(urlOrPath: string): string {
  const path = normalizeMediaPathForSite(urlOrPath);
  if (!path || UNSUPPORTED_EXT.test(path)) {
    return siteConfig.ogImage;
  }
  if (SOCIAL_SAFE_EXT.test(path)) {
    return `${SITE_ORIGIN}${path}`;
  }
  if (NEEDS_PROXY_EXT.test(path)) {
    return `${SITE_ORIGIN}/og-image?src=${encodeURIComponent(path)}`;
  }
  return `${SITE_ORIGIN}${path}`;
}

type OgImageCandidate = {
  path: string;
  width?: number;
  height?: number;
  rank: number;
};

function addMediaCandidate(
  candidates: OgImageCandidate[],
  media: StrapiMedia | undefined,
  baseRank: number
): void {
  if (!media) return;

  const entries: { url?: string; rank: number }[] = [
    { url: media.formats?.large?.url, rank: baseRank },
    { url: media.url, rank: baseRank + 1 },
    { url: media.formats?.medium?.url, rank: baseRank + 2 },
    { url: media.formats?.small?.url, rank: baseRank + 3 },
  ];

  for (const entry of entries) {
    const path = normalizeMediaPathForSite(entry.url);
    if (!path || UNSUPPORTED_EXT.test(path)) continue;
    if (candidates.some((c) => c.path === path)) continue;
    candidates.push({
      path,
      width: media.width,
      height: media.height,
      rank: entry.rank,
    });
  }
}

export interface ResolvedOgImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
  type?: string;
}

/** Choisit la meilleure image pour og:image (aperçu WhatsApp, Facebook, X). */
export function resolveArticleOgImage(
  article: Pick<Article, 'title' | 'featuredImage' | 'content'>
): ResolvedOgImage {
  const alt = article.featuredImage?.alternativeText || article.title;
  const candidates: OgImageCandidate[] = [];

  addMediaCandidate(candidates, article.featuredImage, 0);

  if (!candidates.length && article.content) {
    const fromHtml = firstImageFromHtml(article.content);
    const path = normalizeMediaPathForSite(fromHtml);
    if (path && !UNSUPPORTED_EXT.test(path)) {
      candidates.push({ path, rank: 10 });
    }
  }

  if (!candidates.length) {
    return {
      url: siteConfig.ogImage,
      width: 1200,
      height: 630,
      alt: siteConfig.name,
      type: 'image/jpeg',
    };
  }

  candidates.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (b.width ?? 0) - (a.width ?? 0);
  });

  const best = candidates[0];
  const url = resolveSocialShareImageUrl(best.path);
  const isDirectJpeg = SOCIAL_SAFE_EXT.test(best.path) && /\.jpe?g$/i.test(best.path);

  return {
    url,
    width: best.width,
    height: best.height,
    alt,
    type: isDirectJpeg || NEEDS_PROXY_EXT.test(best.path) ? 'image/jpeg' : undefined,
  };
}

export function isAllowedOgImagePath(path: string): boolean {
  return /^\/(uploads|wp-content)\/[^?#]+$/i.test(path);
}
