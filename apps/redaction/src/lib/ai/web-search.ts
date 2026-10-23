/**
 * Recherche web pour Wab Ai : DuckDuckGo puis Bing (sans clé), ou Tavily / Brave si une clé
 * est configurée (TAVILY_API_KEY, BRAVE_SEARCH_API_KEY).
 */
import { fetchSourceFromUrl, type FetchedSource } from '@/lib/ai/fetch-source';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published?: string;
  engine: 'tavily' | 'brave' | 'duckduckgo' | 'bing';
}

export interface SearchedSource extends FetchedSource {
  snippet?: string;
}

export type SearchFreshness = 'day' | 'week' | 'month' | 'any';

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function isUsableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    return !/(^|\.)duckduckgo\.com$|(^|\.)bing\.com$|(^|\.)microsoft\.com$/.test(host);
  } catch {
    return false;
  }
}

async function getText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15_000),
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function searchTavily(query: string, limit: number, freshness: SearchFreshness) {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;
  const days = freshness === 'day' ? 1 : freshness === 'week' ? 7 : freshness === 'month' ? 31 : undefined;
  const raw = await getText('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: limit,
      search_depth: 'basic',
      topic: days ? 'news' : 'general',
      ...(days ? { days } : {}),
    }),
  });
  const data = JSON.parse(raw) as {
    results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }>;
  };
  return (data.results || [])
    .filter((row) => row.url && isUsableUrl(row.url))
    .map<WebSearchResult>((row) => ({
      title: row.title || row.url!,
      url: row.url!,
      snippet: (row.content || '').slice(0, 400),
      published: row.published_date,
      engine: 'tavily',
    }));
}

async function searchBrave(query: string, limit: number, freshness: SearchFreshness) {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!key) return null;
  const params = new URLSearchParams({ q: query, count: String(limit), search_lang: 'fr' });
  if (freshness !== 'any') {
    params.set('freshness', freshness === 'day' ? 'pd' : freshness === 'week' ? 'pw' : 'pm');
  }
  const raw = await getText(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
  });
  const data = JSON.parse(raw) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string; age?: string }> };
  };
  return (data.web?.results || [])
    .filter((row) => row.url && isUsableUrl(row.url))
    .map<WebSearchResult>((row) => ({
      title: stripTags(row.title || row.url!),
      url: row.url!,
      snippet: stripTags(row.description || ''),
      published: row.age,
      engine: 'brave',
    }));
}

async function searchDuckDuckGo(query: string, limit: number, freshness: SearchFreshness) {
  const params = new URLSearchParams({ q: query, kl: 'fr-fr' });
  if (freshness !== 'any') params.set('df', freshness === 'day' ? 'd' : freshness === 'week' ? 'w' : 'm');
  const html = await getText(`https://html.duckduckgo.com/html/?${params}`);
  const results: WebSearchResult[] = [];
  const blocks = html.split(/<div[^>]+class="[^"]*\bresult\b[^"]*"/i).slice(1);
  for (const block of blocks) {
    if (/result--ad|ad_provider/i.test(block)) continue;
    const link = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!link) continue;
    let href = decodeEntities(link[1]);
    const uddg = /[?&]uddg=([^&]+)/.exec(href)?.[1];
    if (uddg) href = decodeURIComponent(uddg);
    if (href.startsWith('//')) href = `https:${href}`;
    if (!isUsableUrl(href)) continue;
    const snippet = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i.exec(block)?.[1] || '';
    results.push({
      title: stripTags(link[2]),
      url: href,
      snippet: stripTags(snippet),
      engine: 'duckduckgo',
    });
    if (results.length >= limit) break;
  }
  return results;
}

function decodeBingHref(href: string): string {
  const u = /[?&]u=a1([^&]+)/.exec(href)?.[1];
  if (!u) return href;
  try {
    const b64 = u.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(b64 + '='.repeat((4 - (b64.length % 4)) % 4), 'base64').toString('utf8');
  } catch {
    return href;
  }
}

async function searchBing(query: string, limit: number, freshness: SearchFreshness) {
  const params = new URLSearchParams({ q: query, setlang: 'fr', cc: 'FR' });
  if (freshness !== 'any') {
    params.set(
      'filters',
      `ex1:"ez${freshness === 'day' ? '1' : freshness === 'week' ? '2' : '3'}"`
    );
  }
  const html = await getText(`https://www.bing.com/search?${params}`);
  const results: WebSearchResult[] = [];
  const blocks = html.split(/<li class="b_algo"/i).slice(1);
  for (const block of blocks) {
    const link = /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!link) continue;
    const href = decodeBingHref(decodeEntities(link[1]));
    if (!isUsableUrl(href)) continue;
    const snippet =
      /<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(block)?.[1] ||
      /<div class="b_caption"[^>]*>([\s\S]*?)<\/div>/i.exec(block)?.[1] ||
      '';
    results.push({ title: stripTags(link[2]), url: href, snippet: stripTags(snippet), engine: 'bing' });
    if (results.length >= limit) break;
  }
  return results;
}

/** Recherche avec repli automatique entre moteurs. */
export async function searchWeb(
  query: string,
  options?: { limit?: number; freshness?: SearchFreshness }
): Promise<{ results: WebSearchResult[]; errors: string[] }> {
  const q = query.trim().slice(0, 300);
  const limit = Math.min(Math.max(options?.limit ?? 6, 1), 10);
  const freshness = options?.freshness ?? 'any';
  const errors: string[] = [];
  if (!q) return { results: [], errors: ['requête vide'] };

  const engines: Array<[string, () => Promise<WebSearchResult[] | null>]> = [
    ['tavily', () => searchTavily(q, limit, freshness)],
    ['brave', () => searchBrave(q, limit, freshness)],
    ['duckduckgo', () => searchDuckDuckGo(q, limit, freshness)],
    ['bing', () => searchBing(q, limit, freshness)],
  ];

  for (const [name, run] of engines) {
    try {
      const results = await run();
      if (results === null) continue;
      if (results.length) return { results, errors };
      errors.push(`${name}: aucun résultat`);
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : 'erreur'}`);
    }
  }
  return { results: [], errors };
}

/** Recherche plusieurs requêtes, dédoublonne, puis lit les meilleures pages. */
export async function searchAndRead(
  queries: string[],
  options?: { freshness?: SearchFreshness; maxRead?: number; perQuery?: number }
): Promise<{ results: WebSearchResult[]; sources: SearchedSource[]; errors: string[] }> {
  const maxRead = options?.maxRead ?? 4;
  const errors: string[] = [];
  const seen = new Set<string>();
  const results: WebSearchResult[] = [];

  const searches = await Promise.all(
    queries
      .map((query) => query.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((query) => searchWeb(query, { limit: options?.perQuery ?? 6, freshness: options?.freshness }))
  );
  for (const search of searches) {
    errors.push(...search.errors);
    for (const row of search.results) {
      const key = row.url.replace(/[#?].*$/, '').replace(/\/$/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(row);
    }
  }

  const toRead = results.slice(0, maxRead + 2);
  const settled = await Promise.allSettled(
    toRead.map(async (row) => {
      const source = await Promise.race([
        fetchSourceFromUrl(row.url),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('lecture trop longue')), 20_000)),
      ]);
      return { ...source, snippet: row.snippet } satisfies SearchedSource;
    })
  );
  const sources: SearchedSource[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled' && sources.length < maxRead) sources.push(outcome.value);
    else if (outcome.status === 'rejected') {
      errors.push(`${toRead[index].url}: ${outcome.reason instanceof Error ? outcome.reason.message : 'lecture impossible'}`);
    }
  });

  return { results, sources, errors };
}
