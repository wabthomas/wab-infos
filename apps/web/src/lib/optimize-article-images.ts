import { normalizeMediaPathForSite } from '@/lib/og-image-url';

function normalizeBrowserMediaSrc(src: string): string | null {
  if (src.startsWith('data:') || src.includes('/_next/image')) {
    return null;
  }

  const sitePath = normalizeMediaPathForSite(src);
  if (sitePath) return sitePath;

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  if (
    src.startsWith('/uploads/') ||
    src.startsWith('/wp-content/') ||
    src.startsWith('uploads/') ||
    src.startsWith('wp-content/')
  ) {
    return normalizeMediaPathForSite(src.startsWith('/') ? src : `/${src}`);
  }

  return null;
}

function rewriteSrcset(value: string): string {
  return value
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const bits = trimmed.split(/\s+/);
      const url = bits[0];
      const descriptor = bits.slice(1).join(' ');
      const next = normalizeBrowserMediaSrc(url);
      if (!next || next === url) return trimmed;
      return descriptor ? `${next} ${descriptor}` : next;
    })
    .join(', ');
}

/**
 * Réécrit les <img> du corps d'article pour une URL média directe (same-origin).
 */
export function optimizeArticleHtmlImages(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs: string) => {
    let newAttrs = attrs;

    const srcMatch = attrs.match(/\ssrc=(["'])([^"']+)\1/i);
    if (srcMatch) {
      const browserSrc = normalizeBrowserMediaSrc(srcMatch[2]);
      if (browserSrc && browserSrc !== srcMatch[2]) {
        newAttrs = newAttrs.replace(/\ssrc=(["'])([^"']+)\1/i, ` src="${browserSrc}"`);
      }
    }

    const srcsetMatch = newAttrs.match(/\ssrcset=(["'])([^"']+)\1/i);
    if (srcsetMatch) {
      const nextSrcset = rewriteSrcset(srcsetMatch[2]);
      if (nextSrcset !== srcsetMatch[2]) {
        newAttrs = newAttrs.replace(/\ssrcset=(["'])([^"']+)\1/i, ` srcset="${nextSrcset}"`);
      }
    }

    if (!/\bloading\s*=/i.test(newAttrs)) newAttrs += ' loading="lazy"';
    if (!/\bdecoding\s*=/i.test(newAttrs)) newAttrs += ' decoding="async"';
    if (!/\bwidth\s*=/i.test(newAttrs) && !/\bstyle\s*=/i.test(newAttrs)) {
      newAttrs += ' style="max-width:100%;height:auto"';
    }

    return newAttrs === attrs ? full : `<img${newAttrs}>`;
  });
}
