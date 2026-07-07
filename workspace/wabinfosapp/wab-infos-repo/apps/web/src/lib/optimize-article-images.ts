const CONTENT_IMAGE_WIDTH = 1200;
const CONTENT_IMAGE_QUALITY = 75;

function normalizeOptimizablePath(src: string): string | null {
  if (src.startsWith('data:') || src.includes('/_next/image')) {
    return null;
  }

  if (src.startsWith('/uploads/') || src.startsWith('/wp-content/')) {
    return src;
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const { hostname, pathname } = new URL(src);
      if (
        pathname.startsWith('/uploads/') ||
        pathname.startsWith('/wp-content/') ||
        hostname.endsWith('wab-infos.com')
      ) {
        return pathname.startsWith('/') ? pathname : `/${pathname}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  if (src.startsWith('uploads/') || src.startsWith('wp-content/')) {
    return `/${src}`;
  }

  return null;
}

function buildNextImageSrc(
  src: string,
  width = CONTENT_IMAGE_WIDTH,
  quality = CONTENT_IMAGE_QUALITY
): string | null {
  const path = normalizeOptimizablePath(src);
  if (!path) return null;

  const params = new URLSearchParams({
    url: path,
    w: String(width),
    q: String(quality),
  });
  return `/_next/image?${params.toString()}`;
}

/** Réécrit les <img> du corps d'article pour passer par l'optimiseur Next (AVIF/WebP). */
export function optimizeArticleHtmlImages(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs: string) => {
    const srcMatch = attrs.match(/\ssrc=(["'])([^"']+)\1/i);
    if (!srcMatch) return full;

    const optimizedSrc = buildNextImageSrc(srcMatch[2]);
    if (!optimizedSrc) return full;

    let newAttrs = attrs.replace(/\ssrc=(["'])([^"']+)\1/i, ` src="${optimizedSrc}"`);

    if (!/\bloading\s*=/i.test(newAttrs)) newAttrs += ' loading="lazy"';
    if (!/\bdecoding\s*=/i.test(newAttrs)) newAttrs += ' decoding="async"';
    if (!/\bwidth\s*=/i.test(newAttrs) && !/\bstyle\s*=/i.test(newAttrs)) {
      newAttrs += ' style="max-width:100%;height:auto"';
    }

    return `<img${newAttrs}>`;
  });
}
