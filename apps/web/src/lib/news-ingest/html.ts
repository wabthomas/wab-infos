/** Helpers HTML légers (sans cheerio) pour parsers d’articles. */

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractMetaContent(html: string, property: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    'i'
  );
  return re.exec(html)?.[1] || re2.exec(html)?.[1] || undefined;
}

export function extractBetween(
  html: string,
  startRe: RegExp,
  endRe: RegExp
): string | undefined {
  const start = startRe.exec(html);
  if (!start || start.index == null) return undefined;
  const from = start.index + start[0].length;
  const rest = html.slice(from);
  const end = endRe.exec(rest);
  if (!end || end.index == null) return rest.slice(0, 50_000);
  return rest.slice(0, end.index);
}

export function sanitizeArticleHtml(html: string): string {
  let out = html;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  out = out.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  out = out.replace(/javascript:/gi, '');
  // Blocs « lire aussi » / related typiques
  out = out.replace(
    /<div[^>]*field-name-field-article-similaire[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi,
    ''
  );
  out = out.replace(/<ul[^>]*class=["'][^"']*links[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, '');
  return out.trim();
}

export function firstImageFromHtml(html: string): { src?: string; alt?: string; title?: string } {
  const m =
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:(?:alt|title)=["']([^"']*)["'])?/i.exec(html) ||
    /<img[^>]*(?:(?:alt|title)=["']([^"']*)["'])[^>]*src=["']([^"']+)["']/i.exec(html);
  if (!m) return {};
  if (m[1]?.startsWith('http') || m[1]?.startsWith('/')) {
    return { src: m[1], alt: m[2] ? decodeHtmlEntities(m[2]) : undefined };
  }
  return { src: m[2], alt: m[1] ? decodeHtmlEntities(m[1]) : undefined };
}

export function removeFirstImage(html: string): string {
  return html.replace(/<p[^>]*>\s*<img[\s\S]*?<\/p>/i, '').replace(/<img[^>]*>/i, '');
}

export function absolutizeUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

export function excerptFromHtml(html: string, max = 280): string {
  const text = stripTags(html);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function readingTimeFromHtml(html: string): number {
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function appendSourceSignature(html: string, sourceName: string, sourceUrl: string): string {
  const safeName = sourceName.replace(/</g, '');
  const safeUrl = sourceUrl.replace(/"/g, '&quot;');
  const signature = `<p class="article-source"><a href="${safeUrl}" rel="noopener noreferrer" target="_blank">${safeName}</a>, via Wab-infos.com</p>`;
  if (/class=["']article-source["']/.test(html)) return html;
  return `${html.trim()}\n${signature}`;
}
