/**
 * Recherche web large pour Wab Ai.
 *
 * Canaux exécutés en parallèle, puis fusionnés et classés :
 *  - API payantes si une clé existe (Tavily, Brave, Serper/Google, Google CSE) ;
 *  - Google News RSS et Bing News RSS (gratuits, sans clé) ;
 *  - recherche directe dans les médias congolais (WordPress `?s=` + RSS) ;
 *  - DuckDuckGo et Bing (scraping HTML, sans clé) en dernier recours.
 *
 * Aucun canal n’est bloquant : un moteur en échec n’empêche pas les autres.
 */
import { fetchSourceFromUrl, type FetchedSource } from '@/lib/ai/fetch-source';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const MAX_QUERIES = 5;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

export type WebSearchEngine =
  | 'tavily'
  | 'brave'
  | 'serper'
  | 'google-cse'
  | 'google-news'
  | 'bing-news'
  | 'local-media'
  | 'duckduckgo'
  | 'bing';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published?: string;
  engine: WebSearchEngine;
  /** Lien de redirection non lisible directement (Google News) : découverte seulement. */
  noRead?: boolean;
}

export interface SearchedSource extends FetchedSource {
  snippet?: string;
  published?: string;
}

export type SearchFreshness = 'day' | 'week' | 'month' | 'any';

/* ------------------------------------------------------------------ */
/* Utilitaires texte                                                   */
/* ------------------------------------------------------------------ */

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

const BLOCKED_HOSTS =
  /(^|\.)(duckduckgo|bing|microsoft|google|googleusercontent|gstatic)\.(com|fr|cd|be|ca)$|(^|\.)google\.[a-z.]+$/i;

function isUsableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    // Les liens Google News sont des redirections de découverte : autorisés,
    // mais marqués noRead pour ne pas tenter de les lire.
    if (host === 'news.google.com') return true;
    return !BLOCKED_HOSTS.test(host);
  } catch {
    return false;
  }
}

function normalizeKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    // Les paramètres de tracking ne changent pas l’article.
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|source|at_)/i.test(key)) parsed.searchParams.delete(key);
    }
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}${
      parsed.search ? `?${parsed.searchParams.toString()}` : ''
    }`;
  } catch {
    return url;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function withinFreshness(published: string | undefined, freshness: SearchFreshness): boolean {
  if (freshness === 'any') return true;
  if (!published) return true;
  const time = Date.parse(published);
  if (!Number.isFinite(time)) return true;
  const maxAge =
    freshness === 'day' ? 86_400_000 : freshness === 'week' ? 7 * 86_400_000 : 31 * 86_400_000;
  return Date.now() - time <= maxAge;
}

async function getText(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.6',
      Accept: 'text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* ------------------------------------------------------------------ */
/* Parseur RSS minimal (Google News, Bing News, WordPress)             */
/* ------------------------------------------------------------------ */

interface RssItem {
  title: string;
  url: string;
  published?: string;
  source?: string;
}

function rssTag(block: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  if (!match?.[1]) return undefined;
  return decodeEntities(stripTags(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))).trim();
}

function parseRssItems(xml: string, limit: number): RssItem[] {
  const items: RssItem[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    if (items.length >= limit) break;
    const title = rssTag(block, 'title');
    const link = rssTag(block, 'link');
    if (!title || !link || !isUsableUrl(link)) continue;
    items.push({
      title,
      url: link,
      published: rssTag(block, 'pubDate') || rssTag(block, 'dc:date'),
      source: rssTag(block, 'source'),
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Canaux payants / à clé                                              */
/* ------------------------------------------------------------------ */

async function searchTavily(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[] | null> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;
  const days =
    freshness === 'day' ? 1 : freshness === 'week' ? 7 : freshness === 'month' ? 31 : undefined;
  const raw = await getText('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: limit,
      search_depth: 'advanced',
      include_answer: false,
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
      snippet: (row.content || '').slice(0, 450),
      published: row.published_date,
      engine: 'tavily',
    }));
}

async function searchBrave(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[] | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!key) return null;
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(limit, 20)),
    search_lang: 'fr',
    extra_snippets: 'true',
  });
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

/** Serper.dev — résultats Google. */
async function searchSerper(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[] | null> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return null;
  const tbs =
    freshness === 'day' ? 'qdr:d' : freshness === 'week' ? 'qdr:w' : freshness === 'month' ? 'qdr:m' : undefined;
  const raw = await getText('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: query,
      gl: 'cd',
      hl: 'fr',
      num: Math.min(limit, 20),
      ...(tbs ? { tbs } : {}),
    }),
  });
  const data = JSON.parse(raw) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>;
    news?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>;
  };
  return [...(data.news || []), ...(data.organic || [])]
    .filter((row) => row.link && isUsableUrl(row.link))
    .map<WebSearchResult>((row) => ({
      title: stripTags(row.title || row.link!),
      url: row.link!,
      snippet: stripTags(row.snippet || ''),
      published: row.date,
      engine: 'serper',
    }));
}

/** Google Programmable Search (Custom Search JSON API). */
async function searchGoogleCse(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[] | null> {
  const key = process.env.GOOGLE_CSE_API_KEY?.trim() || process.env.GOOGLE_SEARCH_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim() || process.env.GOOGLE_SEARCH_CX?.trim();
  if (!key || !cx) return null;
  const params = new URLSearchParams({
    key,
    cx,
    q: query,
    num: String(Math.min(limit, 10)),
    hl: 'fr',
    gl: 'cd',
  });
  if (freshness !== 'any') {
    params.set('dateRestrict', freshness === 'day' ? 'd1' : freshness === 'week' ? 'w1' : 'm1');
  }
  const raw = await getText(`https://www.googleapis.com/customsearch/v1?${params}`);
  const data = JSON.parse(raw) as {
    items?: Array<{ title?: string; link?: string; snippet?: string; pagemap?: unknown }>;
  };
  return (data.items || [])
    .filter((row) => row.link && isUsableUrl(row.link))
    .map<WebSearchResult>((row) => ({
      title: stripTags(row.title || row.link!),
      url: row.link!,
      snippet: stripTags(row.snippet || ''),
      engine: 'google-cse',
    }));
}

/* ------------------------------------------------------------------ */
/* Canaux gratuits sans clé                                            */
/* ------------------------------------------------------------------ */

function cleanNewsTitle(title: string, source?: string): string {
  if (!source) return title;
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

async function searchGoogleNews(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[]> {
  const when =
    freshness === 'day' ? ' when:1d' : freshness === 'week' ? ' when:7d' : freshness === 'month' ? ' when:30d' : '';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query}${when}`)}&hl=fr&gl=CD&ceid=CD:fr`;
  const xml = await getText(url, undefined, 12_000);
  return parseRssItems(xml, limit)
    .filter((item) => withinFreshness(item.published, freshness))
    .map<WebSearchResult>((item) => ({
      title: cleanNewsTitle(item.title, item.source),
      url: item.url,
      snippet: [item.source ? `Média : ${item.source}` : '', item.published ? `Publié : ${item.published}` : '']
        .filter(Boolean)
        .join(' · '),
      published: item.published,
      engine: 'google-news',
      // Le lien Google News est une redirection JavaScript : utile pour repérer
      // le sujet et le média, pas pour lire l’article.
      noRead: true,
    }));
}

async function searchBingNews(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[]> {
  const params = new URLSearchParams({ q: query, format: 'rss', setlang: 'fr', cc: 'CD' });
  const xml = await getText(`https://www.bing.com/news/search?${params}`, undefined, 12_000);
  return parseRssItems(xml, limit)
    .filter((item) => withinFreshness(item.published, freshness))
    .map<WebSearchResult>((item) => ({
      title: cleanNewsTitle(item.title, item.source),
      url: item.url,
      snippet: item.published ? `Publié : ${item.published}` : '',
      published: item.published,
      engine: 'bing-news',
    }));
}

/** Médias congolais : REST WordPress → recherche HTML → flux RSS. */
const LOCAL_MEDIA: Array<{ name: string; origin: string; htmlSearch: string }> = [
  { name: 'Actualite.cd', origin: 'https://actualite.cd', htmlSearch: '/?s=' },
  { name: 'Radio Okapi', origin: 'https://www.radiookapi.net', htmlSearch: '/recherche?query=' },
  { name: '7sur7.cd', origin: 'https://7sur7.cd', htmlSearch: '/?s=' },
  { name: 'Le Potentiel', origin: 'https://lepotentiel.cd', htmlSearch: '/?s=' },
  { name: 'Opinion-Info', origin: 'https://www.opinion-info.cd', htmlSearch: '/?s=' },
];

/** Liens d’articles dans une page de recherche (URL contenant /AAAA/). */
function parseArticleLinks(html: string, origin: string, limit: number): RssItem[] {
  const originHost = hostOf(origin);
  const seen = new Set<string>();
  const out: RssItem[] = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(regex)) {
    if (out.length >= limit) break;
    let href = decodeEntities(match[1]);
    if (href.startsWith('//')) href = `https:${href}`;
    else if (!/^https?:\/\//i.test(href)) {
      try {
        href = new URL(href, origin).toString();
      } catch {
        continue;
      }
    }
    if (!isUsableUrl(href)) continue;
    if (hostOf(href) !== originHost) continue;
    if (!/\/20\d\d\//.test(new URL(href).pathname)) continue;
    const title = stripTags(match[2])
      .replace(
        /\s+[|–-]\s+(Actualite\.cd|Radio Okapi|7sur7\.cd|Le Potentiel|LePotentiel|Opinion-Info)$/i,
        ''
      )
      .trim();
    if (title.length < 20) continue;
    const key = normalizeKey(href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url: href });
  }

  return out;
}

async function fetchLocalMediaSearch(
  media: { name: string; origin: string; htmlSearch: string },
  query: string,
  limit: number
): Promise<WebSearchResult[]> {
  const perPage = Math.min(Math.max(limit, 3), 8);
  const toResult = (item: RssItem): WebSearchResult => ({
    title: item.title,
    url: item.url,
    snippet: `Média : ${media.name}${item.published ? ` · ${item.published}` : ''}`,
    published: item.published,
    engine: 'local-media',
  });

  // 1) API REST WordPress : la plus fiable quand elle est ouverte.
  try {
    const url = `${media.origin}/wp-json/wp/v2/posts?search=${encodeURIComponent(
      query
    )}&per_page=${perPage}&_fields=link,title,date`;
    const raw = await getText(url, { headers: { Accept: 'application/json' } }, 10_000);
    const rows = JSON.parse(raw) as Array<{
      link?: string;
      date?: string;
      title?: { rendered?: string };
    }>;
    const out = rows
      .filter((row) => row.link && isUsableUrl(row.link))
      .map<WebSearchResult>((row) =>
        toResult({
          title: stripTags(row.title?.rendered || row.link!),
          url: row.link!,
          published: row.date,
        })
      );
    if (out.length) return out;
  } catch {
    // REST indisponible → page de recherche
  }

  // 2) Page de recherche HTML (souvent la seule ouverte aux robots).
  try {
    const html = await getText(
      `${media.origin}${media.htmlSearch}${encodeURIComponent(query)}`,
      undefined,
      12_000
    );
    const out = parseArticleLinks(html, media.origin, perPage).map(toResult);
    if (out.length) return out;
  } catch {
    // HTML indisponible → flux RSS
  }

  // 3) Flux RSS de recherche WordPress.
  const xml = await getText(
    `${media.origin}/?s=${encodeURIComponent(query)}&feed=rss2`,
    undefined,
    10_000
  );
  return parseRssItems(xml, perPage).map(toResult);
}

async function searchLocalMedia(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[]> {
  const settled = await Promise.allSettled(
    LOCAL_MEDIA.map((media) => fetchLocalMediaSearch(media, query, limit))
  );

  const out: WebSearchResult[] = [];
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    out.push(...outcome.value.filter((row) => withinFreshness(row.published, freshness)));
  }
  return out;
}

async function searchDuckDuckGo(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[]> {
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

async function searchBing(
  query: string,
  limit: number,
  freshness: SearchFreshness
): Promise<WebSearchResult[]> {
  const params = new URLSearchParams({ q: query, setlang: 'fr', cc: 'CD' });
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

/* ------------------------------------------------------------------ */
/* Fusion + classement                                                 */
/* ------------------------------------------------------------------ */

const ENGINE_WEIGHT: Record<WebSearchEngine, number> = {
  'local-media': 8,
  'bing-news': 6,
  serper: 5,
  'google-cse': 5,
  tavily: 4,
  brave: 4,
  'google-news': 4,
  duckduckgo: 2,
  bing: 1,
};

const DOMAIN_RULES: Array<[RegExp, number]> = [
  [
    /(^|\.)(presidence|primature|assemblee-nationale|senat|cour-constitutionnelle|ceni|gouvernement|finances|budget|mining|sante|education)\.(cd|gouv\.cd)$/i,
    12,
  ],
  [
    /(^|\.)(who|un|unicef|undp|worldbank|imf|unhcr|wfp|monusco)\.(int|org|unmissions\.org)$/i,
    10,
  ],
  [
    /(^|\.)(actualite|7sur7|lepotentiel|opinion-info)\.cd$|(^|\.)radiookapi\.net$|(^|\.)rtnc\.cd$|(^|\.)acpcongo\.com$|(^|\.)adiac-congo\.com$/i,
    9,
  ],
  [
    /(^|\.)(rfi|france24|jeuneafrique|lemonde|reuters|apnews|bbc|aljazeera|africanews)\.(fr|com|net|co\.uk)$/i,
    6,
  ],
  [/(^|\.)(facebook|instagram|tiktok|pinterest|threads|linkedin|youtube)\./i, -14],
  [/(^|\.)(quora|reddit|wikipedia|fandom)\./i, -3],
];

function domainBoost(host: string): number {
  for (const [rule, boost] of DOMAIN_RULES) {
    if (rule.test(host)) return boost;
  }
  return 0;
}

function recencyBoost(published?: string): number {
  if (!published) return 0;
  const time = Date.parse(published);
  if (!Number.isFinite(time)) return 0;
  const age = Date.now() - time;
  if (age < 0) return 0;
  if (age <= 48 * 3_600_000) return 4;
  if (age <= 7 * 86_400_000) return 2;
  return 0;
}

interface RankedEntry {
  row: WebSearchResult;
  engines: Set<WebSearchEngine>;
  score: number;
}

function mergeResults(rows: WebSearchResult[], limit: number): WebSearchResult[] {
  const map = new Map<string, RankedEntry>();

  for (const row of rows) {
    if (!row.url || !isUsableUrl(row.url)) continue;
    const key = normalizeKey(row.url);
    const base =
      ENGINE_WEIGHT[row.engine] + domainBoost(hostOf(row.url)) + recencyBoost(row.published);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { row: { ...row }, engines: new Set([row.engine]), score: base });
      continue;
    }
    existing.engines.add(row.engine);
    existing.score = Math.max(existing.score, base);
    // On garde le snippet le plus informatif et la date la plus précise.
    if ((row.snippet?.length ?? 0) > (existing.row.snippet?.length ?? 0)) {
      existing.row.snippet = row.snippet;
    }
    if (!existing.row.published && row.published) existing.row.published = row.published;
    if (existing.row.noRead && !row.noRead) {
      existing.row.noRead = false;
      existing.row.url = row.url;
    }
  }

  const ranked = [...map.values()].map((entry) => ({
    row: entry.row,
    // Plusieurs moteurs confirment le même lien : signal de qualité.
    score: entry.score + Math.max(0, entry.engines.size - 1) * 3,
    publishedMs: Date.parse(entry.row.published || '') || 0,
  }));

  ranked.sort((a, b) => b.score - a.score || b.publishedMs - a.publishedMs);

  // Diversité éditoriale : au plus 2 résultats par domaine, puis on complète.
  const selected: WebSearchResult[] = [];
  const skipped: WebSearchResult[] = [];
  const perHost = new Map<string, number>();

  for (const item of ranked) {
    const host = hostOf(item.row.url);
    const used = perHost.get(host) ?? 0;
    if (used >= 2) {
      skipped.push(item.row);
      continue;
    }
    perHost.set(host, used + 1);
    selected.push(item.row);
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const row of skipped) {
      selected.push(row);
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* Cache mémoire court : évite de marteler les moteurs quand l’IA reformule
   plusieurs fois la même requête dans un même échange. */
const SEARCH_CACHE_TTL_MS = 5 * 60_000;
const SEARCH_CACHE_MAX = 80;
const searchCache = new Map<
  string,
  { at: number; value: { results: WebSearchResult[]; errors: string[]; engines: string[] } }
>();

function readSearchCache(key: string) {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeSearchCache(
  key: string,
  value: { results: WebSearchResult[]; errors: string[]; engines: string[] }
) {
  if (value.results.length === 0) return;
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) searchCache.delete(oldest[0]);
  }
  searchCache.set(key, { at: Date.now(), value });
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/** Recherche large : tous les canaux disponibles en parallèle. */
export async function searchWeb(
  query: string,
  options?: {
    limit?: number;
    freshness?: SearchFreshness;
    /** Restreint les canaux (ex. recherche X : pas de RSS news/local). */
    channels?: WebSearchEngine[];
  }
): Promise<{ results: WebSearchResult[]; errors: string[]; engines: string[] }> {
  const q = query.trim().slice(0, 320);
  const limit = clamp(options?.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
  const freshness = options?.freshness ?? 'any';
  if (!q) return { results: [], errors: ['requête vide'], engines: [] };

  const cacheKey = `${freshness}|${limit}|${options?.channels?.join(',') ?? 'all'}|${q.toLowerCase()}`;
  const cached = readSearchCache(cacheKey);
  if (cached) return cached;

  const allChannels: Array<[WebSearchEngine, () => Promise<WebSearchResult[] | null>]> = [
    ['tavily', () => searchTavily(q, limit, freshness)],
    ['brave', () => searchBrave(q, limit, freshness)],
    ['serper', () => searchSerper(q, limit, freshness)],
    ['google-cse', () => searchGoogleCse(q, limit, freshness)],
    ['google-news', () => searchGoogleNews(q, limit, freshness)],
    ['bing-news', () => searchBingNews(q, limit, freshness)],
    ['local-media', () => searchLocalMedia(q, limit, freshness)],
    ['duckduckgo', () => searchDuckDuckGo(q, limit, freshness)],
    ['bing', () => searchBing(q, limit, freshness)],
  ];

  const allowed = options?.channels?.length ? new Set(options.channels) : null;
  const channels = allowed ? allChannels.filter(([name]) => allowed.has(name)) : allChannels;

  const settled = await Promise.allSettled(channels.map(([, run]) => run()));
  const errors: string[] = [];
  const engines: string[] = [];
  const rows: WebSearchResult[] = [];

  settled.forEach((outcome, index) => {
    const name = channels[index][0];
    if (outcome.status === 'rejected') {
      errors.push(`${name}: ${outcome.reason instanceof Error ? outcome.reason.message : 'erreur'}`);
      return;
    }
    if (!outcome.value) return; // canal non configuré
    if (outcome.value.length === 0) return;
    engines.push(name);
    rows.push(...outcome.value);
  });

  const value = { results: mergeResults(rows, limit), errors, engines };
  writeSearchCache(cacheKey, value);
  return value;
}/**
 * Recherche plusieurs angles puis lit les meilleures pages en parallèle.
 * Les liens de redirection (Google News) servent à la découverte mais ne sont
 * pas lus : on privilégie les URLs directes des éditeurs.
 */
export async function searchAndRead(
  queries: string[],
  options?: { freshness?: SearchFreshness; maxRead?: number; perQuery?: number }
): Promise<{
  results: WebSearchResult[];
  sources: SearchedSource[];
  errors: string[];
  engines: string[];
}> {
  const maxRead = clamp(options?.maxRead ?? 6, 1, 10);
  const perQuery = clamp(options?.perQuery ?? 8, 1, 12);
  const errors: string[] = [];
  const engines = new Set<string>();
  const seen = new Set<string>();
  let results: WebSearchResult[] = [];

  const cleanQueries = queries
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, MAX_QUERIES);

  const searches = await Promise.all(
    cleanQueries.map((query) =>
      searchWeb(query, { limit: perQuery, freshness: options?.freshness })
    )
  );

  for (const search of searches) {
    errors.push(...search.errors);
    for (const engine of search.engines) engines.add(engine);
    for (const row of search.results) {
      const key = normalizeKey(row.url);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(row);
    }
  }

  // Les résultats de plusieurs requêtes sont re-classés ensemble : on lit
  // d’abord les sources les plus fiables, pas celles de la première requête.
  results = mergeResults(results, Math.max(20, maxRead * 4));

  // Diversité de lecture : au plus 2 pages par média, pour croiser les sources.
  const readable: WebSearchResult[] = [];
  const hostsRead = new Map<string, number>();
  for (const row of results) {
    if (row.noRead) continue;
    const host = hostOf(row.url);
    if ((hostsRead.get(host) ?? 0) >= 2) continue;
    hostsRead.set(host, (hostsRead.get(host) ?? 0) + 1);
    readable.push(row);
    if (readable.length >= maxRead) break;
  }
  if (readable.length < maxRead) {
    for (const row of results) {
      if (row.noRead || readable.includes(row)) continue;
      readable.push(row);
      if (readable.length >= maxRead) break;
    }
  }

  const toRead = readable;
  const settled = await Promise.allSettled(
    toRead.map(async (row) => {
      const source = await Promise.race([
        fetchSourceFromUrl(row.url),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('lecture trop longue')), 22_000)
        ),
      ]);
      return { ...source, snippet: row.snippet, published: row.published } satisfies SearchedSource;
    })
  );

  const sources: SearchedSource[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') sources.push(outcome.value);
    else {
      errors.push(
        `${toRead[index].url}: ${
          outcome.reason instanceof Error ? outcome.reason.message : 'lecture impossible'
        }`
      );
    }
  });

  return { results, sources, errors, engines: [...engines] };
}
