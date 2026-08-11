function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DL_SHORTCODE_RE = /\[dl\s+([^\]]+)\]/gi;
const DL_IN_PARAGRAPH_RE = /<p(?:\s[^>]*)?>\s*(\[dl\s+[^\]]+\])\s*<\/p>/gi;
const READ_ALSO_SHORTCODE_RE = /\[lire-aussi\s+([^\]]+)\]/gi;
const READ_ALSO_IN_PARAGRAPH_RE =
  /<p(?:\s[^>]*)?>\s*(\[lire-aussi\s+[^\]]+\])\s*<\/p>/gi;

function decodeShortcodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function parseShortcodeAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const decoded = decodeShortcodeEntities(raw);
  const re = /(\w+)\s*=\s*(["'])(.*?)\2/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(decoded)) !== null) {
    attrs[match[1].toLowerCase()] = match[3].trim();
  }
  return attrs;
}

/** Réécrit les URLs média WP vers le chemin public same-origin. */
function normalizeDlMediaUrl(raw: string): string | null {
  const trimmed = decodeShortcodeEntities(raw).trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return null;
  }

  let url = trimmed.replace(
    /^https?:\/\/(?:www\.)?wab-infos\.com\/wp-content\/uploads\//i,
    '/wp-content/uploads/'
  );

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/wp-content/uploads/')) {
        return `${parsed.pathname}${parsed.search}`;
      }
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${parsed.pathname}${parsed.search}`;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  if (url.startsWith('wp-content/')) url = `/${url}`;
  if (url.startsWith('uploads/')) url = `/${url}`;
  if (!url.startsWith('/')) return null;
  return url;
}

function normalizeArticleHref(raw: string): string | null {
  const trimmed = decodeShortcodeEntities(raw).trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || trimmed;
    } catch {
      return null;
    }
  }
  return null;
}

function expandDlShortcode(fullMatch: string): string {
  const inner = fullMatch.replace(/^\[dl\s+/i, '').replace(/\]$/, '');
  const attrs = parseShortcodeAttrs(inner);
  const mediaUrl = normalizeDlMediaUrl(attrs.url || '');
  if (!mediaUrl) return fullMatch;

  const title = attrs.title?.trim() || 'Télécharger';
  const desc = attrs.desc?.trim() || '';
  const type = (attrs.type?.trim() || 'file').toLowerCase();
  const isAudio = type === 'audio' || /\.mp3(?:$|[?#])/i.test(mediaUrl);
  const safeHref = escapeHtml(mediaUrl);
  const safeTitle = escapeHtml(title);
  const safeDesc = desc ? escapeHtml(desc) : '';

  const player = isAudio
    ? `<audio class="article-dl__player" controls preload="metadata" src="${safeHref}">
  Votre navigateur ne prend pas en charge la lecture audio.
</audio>`
    : '';

  return `<figure class="article-dl${isAudio ? ' article-dl--audio' : ''}">
  ${safeDesc ? `<figcaption class="article-dl__desc">${safeDesc}</figcaption>` : ''}
  ${player}
  <p class="article-dl__actions">
    <a class="article-dl__btn" href="${safeHref}" download rel="noopener noreferrer">${safeTitle}</a>
  </p>
</figure>`;
}

function expandReadAlsoShortcode(fullMatch: string): string {
  const inner = fullMatch.replace(/^\[lire-aussi\s+/i, '').replace(/\]$/, '');
  const attrs = parseShortcodeAttrs(inner);
  const href = normalizeArticleHref(attrs.href || attrs.url || '');
  const title = attrs.title?.trim();
  if (!href || !title) return fullMatch;

  const category = attrs.category?.trim() || '';
  const image = attrs.image ? normalizeDlMediaUrl(attrs.image) : null;
  const safeHref = escapeHtml(href);
  const safeTitle = escapeHtml(title);
  const safeCategory = category ? escapeHtml(category) : '';
  const safeImage = image ? escapeHtml(image) : '';

  const thumb = safeImage
    ? `<span class="article-read-also__thumb">
  <img src="${safeImage}" alt="" loading="lazy" decoding="async" />
</span>`
    : '';

  return `<aside class="article-read-also article-read-also--manual not-prose" aria-label="Lire aussi">
  <a class="article-read-also__link" href="${safeHref}">
    ${thumb}
    <span class="article-read-also__body">
      <span class="article-read-also__eyebrow">Lire aussi</span>
      <span class="article-read-also__title">${safeTitle}</span>
      ${safeCategory ? `<span class="article-read-also__category">${safeCategory}</span>` : ''}
    </span>
  </a>
</aside>`;
}

/**
 * Transforme les shortcodes `[dl …]` et `[lire-aussi …]` en HTML public.
 */
export function expandArticleShortcodes(html: string): string {
  if (!html || (!/\[dl\s/i.test(html) && !/\[lire-aussi\s/i.test(html))) return html;

  let out = html.replace(DL_IN_PARAGRAPH_RE, (_, shortcode: string) =>
    expandDlShortcode(shortcode)
  );
  out = out.replace(DL_SHORTCODE_RE, (shortcode) => expandDlShortcode(shortcode));
  out = out.replace(READ_ALSO_IN_PARAGRAPH_RE, (_, shortcode: string) =>
    expandReadAlsoShortcode(shortcode)
  );
  out = out.replace(READ_ALSO_SHORTCODE_RE, (shortcode) => expandReadAlsoShortcode(shortcode));
  return out;
}
