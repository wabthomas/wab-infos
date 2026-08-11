import type { DiscoveredItem } from './types';
import { decodeHtmlEntities, stripTags } from './html';

function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = re.exec(block);
  if (!m?.[1]) return undefined;
  return decodeHtmlEntities(stripTags(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')));
}

function extractLink(block: string): string | undefined {
  const guid = /<guid[^>]*isPermaLink=["']true["'][^>]*>([^<]+)<\/guid>/i.exec(block)?.[1];
  if (guid?.startsWith('http')) return guid.trim();
  const link = extractTag(block, 'link');
  if (link?.startsWith('http')) return link;
  const linkHref = /<link[^>]+href=["']([^"']+)["']/i.exec(block)?.[1];
  return linkHref?.startsWith('http') ? linkHref : undefined;
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'WabInfosNewsIngest/1.0 (+https://wab-infos.com)',
      Accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(25_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function discoverFromRss(rssUrl: string, limit = 12): Promise<DiscoveredItem[]> {
  const xml = await fetchText(rssUrl);
  const items: DiscoveredItem[] = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) && items.length < limit) {
    const block = match[1] || '';
    const url = extractLink(block);
    if (!url) continue;
    const title = extractTag(block, 'title');
    const publishedAt = extractTag(block, 'pubDate');
    const categoryHint = extractTag(block, 'category');
    items.push({ url, title, publishedAt, categoryHint });
  }
  return items;
}

export async function discoverFromRssList(
  rssUrls: string[],
  limit = 12
): Promise<DiscoveredItem[]> {
  const seen = new Set<string>();
  const out: DiscoveredItem[] = [];
  for (const rssUrl of rssUrls) {
    try {
      const items = await discoverFromRss(rssUrl, limit);
      for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        out.push(item);
        if (out.length >= limit) return out;
      }
      if (out.length > 0) return out;
    } catch {
      // try next feed
    }
  }
  return out;
}
