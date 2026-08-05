const DEFAULT_PUBLIC_CMS = 'https://cms.app.wab-infos.com';

function publicCmsOrigin(): string {
  const raw = (
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.STRAPI_URL ||
    DEFAULT_PUBLIC_CMS
  ).replace(/\/$/, '');
  try {
    const host = new URL(raw).hostname;
    if (
      process.env.NODE_ENV === 'production' &&
      (host === 'localhost' || host === '127.0.0.1')
    ) {
      return DEFAULT_PUBLIC_CMS;
    }
  } catch {
    return DEFAULT_PUBLIC_CMS;
  }
  return raw || DEFAULT_PUBLIC_CMS;
}

/** Absolutise une URL média sans importer `@/lib/utils` (évite le cycle avec formatArticleContent). */
function toBrowserMediaSrc(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (
        process.env.NODE_ENV === 'production' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
        parsed.pathname.startsWith('/uploads/')
      ) {
        return `${DEFAULT_PUBLIC_CMS}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return url;
    }
    return url;
  }

  const path = url.startsWith('/') ? url : `/${url}`;
  if (path.startsWith('/uploads/')) {
    return `${publicCmsOrigin()}${path}`;
  }
  return path;
}

function normalizeBrowserMediaSrc(src: string): string | null {
  if (src.startsWith('data:') || src.includes('/_next/image')) {
    return null;
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return toBrowserMediaSrc(src);
  }

  if (
    src.startsWith('/uploads/') ||
    src.startsWith('/wp-content/') ||
    src.startsWith('uploads/') ||
    src.startsWith('wp-content/')
  ) {
    return toBrowserMediaSrc(src.startsWith('/') ? src : `/${src}`);
  }

  return null;
}

/**
 * Réécrit les <img> du corps d'article pour une URL média directe (CMS).
 * Ne passe plus par `/_next/image` : l’optimiseur timeout en prod sur ces sources.
 */
export function optimizeArticleHtmlImages(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs: string) => {
    const srcMatch = attrs.match(/\ssrc=(["'])([^"']+)\1/i);
    if (!srcMatch) return full;

    const browserSrc = normalizeBrowserMediaSrc(srcMatch[2]);
    let newAttrs = attrs;

    if (browserSrc && browserSrc !== srcMatch[2]) {
      newAttrs = newAttrs.replace(/\ssrc=(["'])([^"']+)\1/i, ` src="${browserSrc}"`);
    }

    if (!/\bloading\s*=/i.test(newAttrs)) newAttrs += ' loading="lazy"';
    if (!/\bdecoding\s*=/i.test(newAttrs)) newAttrs += ' decoding="async"';
    if (!/\bwidth\s*=/i.test(newAttrs) && !/\bstyle\s*=/i.test(newAttrs)) {
      newAttrs += ' style="max-width:100%;height:auto"';
    }

    return newAttrs === attrs ? full : `<img${newAttrs}>`;
  });
}
