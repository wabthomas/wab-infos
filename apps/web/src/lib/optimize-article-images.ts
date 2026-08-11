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

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractAttr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\s${name}=(["'])([^"']*)\\1`, 'i'));
  return match ? match[2] : null;
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Réécrit les <img> du corps d'article pour une URL média directe (same-origin)
 * et enveloppe celles qui ont une légende (title / data-caption) dans <figure>.
 */
export function optimizeArticleHtmlImages(html: string): string {
  let out = html.replace(
    /(<figure\b[\s\S]*?<\/figure>)|(<img\b([^>]*?)>)/gi,
    (full, existingFigure?: string, _imgFull?: string, attrs?: string) => {
      if (existingFigure) {
        return optimizeExistingFigure(existingFigure);
      }
      return rewriteImgTag(full, attrs ?? '', { wrapCaption: true });
    }
  );

  // <p><figure>…</figure></p> est invalide : le navigateur casse souvent la légende
  out = out.replace(/<p>\s*(<figure\b[\s\S]*?<\/figure>)\s*<\/p>/gi, '$1');

  return out;
}

function optimizeExistingFigure(figureHtml: string): string {
  const withOptimizedImg = figureHtml.replace(/<img\b([^>]*?)>/gi, (imgTag, imgAttrs: string) =>
    rewriteImgTag(imgTag, imgAttrs, { wrapCaption: false })
  );

  if (/<figcaption\b/i.test(withOptimizedImg)) {
    return withOptimizedImg.replace(
      /<figure\b([^>]*)>/i,
      (_full, attrs: string) => {
        if (/\barticle-image-figure\b/i.test(attrs)) {
          return `<figure${attrs}>`;
        }
        const trimmed = attrs.trim();
        if (/\bclass=(["'])([^"']*)\1/i.test(attrs)) {
          return `<figure${attrs.replace(
            /\bclass=(["'])([^"']*)\1/i,
            (_m, q: string, cls: string) => `class=${q}${cls} article-image-figure${q}`
          )}>`;
        }
        return `<figure class="article-image-figure"${trimmed ? ` ${trimmed}` : ''}>`;
      }
    ).replace(
      /<figcaption\b([^>]*)>/i,
      (full, attrs: string) => {
        if (/\barticle-image-caption\b/i.test(attrs)) return full;
        if (/\bclass=(["'])([^"']*)\1/i.test(attrs)) {
          return `<figcaption${attrs.replace(
            /\bclass=(["'])([^"']*)\1/i,
            (_m, q: string, cls: string) => `class=${q}${cls} article-image-caption${q}`
          )}>`;
        }
        const trimmed = attrs.trim();
        return `<figcaption class="article-image-caption"${trimmed ? ` ${trimmed}` : ''}>`;
      }
    );
  }

  const imgMatch = withOptimizedImg.match(/<img\b([^>]*?)>/i);
  if (!imgMatch) return withOptimizedImg;
  const imgAttrs = imgMatch[1] ?? '';
  const caption =
    decodeBasicEntities(
      extractAttr(imgAttrs, 'data-caption')?.trim() ||
        extractAttr(imgAttrs, 'title')?.trim() ||
        extractAttr(imgAttrs, 'alt')?.trim() ||
        ''
    ).trim();
  if (!caption) return withOptimizedImg;

  const imgTag = imgMatch[0];
  return `<figure class="article-image-figure">${imgTag}<figcaption class="article-image-caption">${escapeHtmlText(caption)}</figcaption></figure>`;
}

function rewriteImgTag(
  full: string,
  attrs: string,
  options: { wrapCaption: boolean }
): string {
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

  const imgTag = newAttrs === attrs ? full : `<img${newAttrs}>`;
  if (!options.wrapCaption) return imgTag;

  const caption = decodeBasicEntities(
    extractAttr(newAttrs, 'data-caption')?.trim() ||
      extractAttr(newAttrs, 'title')?.trim() ||
      // Anciens articles : texte saisi dans alt avant le champ Légende
      extractAttr(newAttrs, 'alt')?.trim() ||
      ''
  ).trim();

  if (!caption) return imgTag;

  return `<figure class="article-image-figure">${imgTag}<figcaption class="article-image-caption">${escapeHtmlText(caption)}</figcaption></figure>`;
}
