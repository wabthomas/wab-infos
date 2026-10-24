/** Récupère le texte et une image candidate depuis une URL (article web ou X/Twitter). */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export interface FetchedSource {
  url: string;
  title: string;
  text: string;
  imageUrl: string | null;
  imageAlt: string | null;
  kind: 'twitter' | 'web';
  via?: 'direct' | 'oembed' | 'reader' | 'fxtwitter';
}

function decodeHtmlEntities(input: string): string {
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

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaContent(html: string, property: string): string | undefined {
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

function firstImageFromHtml(html: string): { src?: string; alt?: string } {
  const m =
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:(?:alt|title)=["']([^"']*)["'])?/i.exec(html) ||
    /<img[^>]*(?:(?:alt|title)=["']([^"']*)["'])[^>]*src=["']([^"']+)["']/i.exec(html);
  if (!m) return {};
  if (m[1]?.startsWith('http') || m[1]?.startsWith('/')) {
    return { src: m[1], alt: m[2] ? decodeHtmlEntities(m[2]) : undefined };
  }
  return { src: m[2], alt: m[1] ? decodeHtmlEntities(m[1]) : undefined };
}

function absolutizeUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function isTwitterUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com';
  } catch {
    return false;
  }
}

export function normalizeUrl(raw: string): string {
  let trimmed = raw.trim().replace(/[.,;:!?)\]]+$/g, '');
  if (!trimmed) throw new Error('URL vide');
  // Collage mobile parfois sans schéma
  if (/^\/\//.test(trimmed)) trimmed = `https:${trimmed}`;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL non supportée');
  }
  return parsed.toString();
}

async function fetchText(url: string, accept = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: accept,
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(28_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Repli lecture via Jina Reader (contourne beaucoup de blocages bot). */
async function fetchViaReader(url: string): Promise<FetchedSource> {
  const readerUrl = `https://r.jina.ai/${url}`;
  const raw = await fetchText(readerUrl, 'text/plain,*/*;q=0.8');
  const text = raw.replace(/\u0000/g, '').trim();
  if (text.length < 40) throw new Error('Reader: contenu insuffisant');

  const titleLine =
    /^Title:\s*(.+)$/im.exec(text)?.[1]?.trim() ||
    /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ||
    'Article';
  // Image éventuelle dans le markdown Jina
  const mdImage = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i.exec(text)?.[1] || null;

  return {
    url,
    title: titleLine.slice(0, 300),
    text: text.slice(0, 14_000),
    imageUrl: mdImage,
    imageAlt: titleLine,
    kind: isTwitterUrl(url) ? 'twitter' : 'web',
    via: 'reader',
  };
}

async function fetchTwitterSource(url: string): Promise<FetchedSource> {
  try {
    const { fetchXPostByUrl } = await import('@/lib/ai/x-search');
    const post = await fetchXPostByUrl(url);
    if (post?.text) {
      return {
        url: post.url,
        title: post.title,
        text: post.text,
        imageUrl: post.imageUrl,
        imageAlt: post.title,
        kind: 'twitter',
        via: 'fxtwitter',
      };
    }
  } catch {
    // repli oEmbed
  }

  const oembedUrl = `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url)}`;
  try {
    const raw = await fetchText(oembedUrl, 'application/json,text/javascript,*/*;q=0.8');
    const data = JSON.parse(raw) as {
      html?: string;
      author_name?: string;
      url?: string;
    };
    const html = data.html || '';
    const text = stripTags(html).slice(0, 4_000);
    const title =
      text.slice(0, 120) ||
      (data.author_name ? `Publication de ${data.author_name}` : 'Publication X');

    let imageUrl: string | null = null;
    let imageAlt: string | null = null;
    try {
      const pageHtml = await fetchText(url);
      const og = extractMetaContent(pageHtml, 'og:image');
      if (og) {
        imageUrl = absolutizeUrl(decodeHtmlEntities(og), url);
        imageAlt = extractMetaContent(pageHtml, 'og:image:alt') || title;
      }
    } catch {
      // oembed suffit
    }

    if (!text || text.length < 20) throw new Error('oembed vide');

    return {
      url,
      title,
      text: text || title,
      imageUrl,
      imageAlt,
      kind: 'twitter',
      via: 'oembed',
    };
  } catch {
    return fetchViaReader(url);
  }
}

async function fetchWebSourceDirect(url: string): Promise<FetchedSource> {
  const html = await fetchText(url);
  const ogTitle = extractMetaContent(html, 'og:title');
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = decodeHtmlEntities(ogTitle || titleTag || 'Article').replace(/\s+/g, ' ').slice(0, 300);

  const ogDesc = extractMetaContent(html, 'og:description');
  const articleMatch =
    /<article[\s>]([\s\S]*?)<\/article>/i.exec(html)?.[1] ||
    /<main[\s>]([\s\S]*?)<\/main>/i.exec(html)?.[1] ||
    html;
  const cleaned = articleMatch
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');
  const bodyText = stripTags(cleaned).slice(0, 12_000);
  const text = (ogDesc ? `${decodeHtmlEntities(ogDesc)}\n\n${bodyText}` : bodyText).trim();

  const ogImage = extractMetaContent(html, 'og:image');
  const fromBody = firstImageFromHtml(cleaned);
  const rawImage = ogImage || fromBody.src || null;
  const imageUrl = rawImage ? absolutizeUrl(decodeHtmlEntities(rawImage), url) : null;
  const imageAlt =
    (extractMetaContent(html, 'og:image:alt') &&
      decodeHtmlEntities(extractMetaContent(html, 'og:image:alt')!)) ||
    fromBody.alt ||
    title;

  // Bloqué / page login / JS shell : trop court → forcer le reader
  if (!text || text.length < 80) {
    throw new Error('Contenu HTML insuffisant');
  }

  return {
    url,
    title,
    text,
    imageUrl,
    imageAlt: imageAlt || null,
    kind: 'web',
    via: 'direct',
  };
}

export async function fetchSourceFromUrl(rawUrl: string): Promise<FetchedSource> {
  const url = normalizeUrl(rawUrl);
  const errors: string[] = [];

  if (isTwitterUrl(url)) {
    try {
      return await fetchTwitterSource(url);
    } catch (error) {
      errors.push(`twitter: ${error instanceof Error ? error.message : 'erreur'}`);
    }
  } else {
    try {
      return await fetchWebSourceDirect(url);
    } catch (error) {
      errors.push(`direct: ${error instanceof Error ? error.message : 'erreur'}`);
    }
  }

  try {
    return await fetchViaReader(url);
  } catch (error) {
    errors.push(`reader: ${error instanceof Error ? error.message : 'erreur'}`);
  }

  throw new Error(`Impossible de lire le lien (${errors.join(' · ')})`);
}
