/**
 * Recherche sur X (Twitter) via moteurs (site:x.com) + lecture FxTwitter,
 * limitée à des comptes crédibles (médias / institutions RDC & Afrique).
 */
import { searchWeb, type SearchFreshness, type WebSearchResult } from '@/lib/ai/web-search';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** Comptes publics fiables pour l'actu RDC / Afrique (handles sans @). */
export const CREDIBLE_X_HANDLES = [
  'radiookapi',
  'actualitecd',
  'presidence_rdc',
  '7sur7cd',
  'mediacongo',
  'rttrdc',
  'numeriquerdc',
  'minaffetrdc',
  'assembleenatrdc',
  'senatrdc',
  'deskecocd',
  'deskjusticecd',
  'desknature',
  'jeune_afrique',
  'rfi',
  'rfi_afrique',
  'afp',
  'afpafrique',
  'reuters',
  'reutersafrique',
  'france24',
  'france24_fr',
  'voaafrique',
  'bbcafrique',
  'africanews',
  'unpeacekeeping',
  'monusco',
  'who_africa',
  'omsomsafrica',
] as const;

export interface XPostSource {
  url: string;
  title: string;
  text: string;
  author: string;
  handle: string;
  published?: string;
  imageUrl: string | null;
  ok: true;
  kind: 'twitter';
  via: 'fxtwitter';
  origin: 'x';
}

function normalizeHandle(raw: string): string {
  return raw.replace(/^@/, '').trim().toLowerCase();
}

function extractStatusId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (!/(^|\.)(x|twitter)\.com$/.test(host)) return null;
    const match = parsed.pathname.match(/\/(?:i\/web\/)?status(?:es)?\/(\d+)/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function extractHandleFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (!parts[0] || parts[0].toLowerCase() === 'i') return null;
    return normalizeHandle(parts[0]);
  } catch {
    return null;
  }
}

function isAllowedHandle(handle: string, allow: Set<string>): boolean {
  return allow.has(normalizeHandle(handle));
}

async function fetchFxTweet(statusId: string): Promise<XPostSource | null> {
  const res = await fetch(`https://api.fxtwitter.com/status/${statusId}`, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    code?: number;
    tweet?: {
      url?: string;
      text?: string;
      created_at?: string;
      author?: {
        name?: string;
        screen_name?: string;
      };
      media?: {
        photos?: Array<{ url?: string }>;
        videos?: Array<{ thumbnail_url?: string }>;
      };
      quote?: { text?: string; author?: { screen_name?: string } };
    };
  };
  const tweet = data.tweet;
  if (!tweet?.text || !tweet.url) return null;
  const handle = normalizeHandle(tweet.author?.screen_name || extractHandleFromUrl(tweet.url) || '');
  const author = tweet.author?.name || handle || 'X';
  const quote = tweet.quote?.text
    ? `\n[Citation @${tweet.quote.author?.screen_name || '?'}] ${tweet.quote.text}`
    : '';
  const imageUrl =
    tweet.media?.photos?.[0]?.url || tweet.media?.videos?.[0]?.thumbnail_url || null;

  return {
    url: tweet.url,
    title: `${author} (@${handle}) sur X`,
    text: `${tweet.text}${quote}`.slice(0, 4_000),
    author,
    handle,
    published: tweet.created_at,
    imageUrl,
    ok: true,
    kind: 'twitter',
    via: 'fxtwitter',
    origin: 'x',
  };
}

function buildXQueries(topic: string, handles: string[]): string[] {
  const q = topic.trim().replace(/^@\w+\s*/, '').slice(0, 160);
  const unique = [...new Set(handles.map(normalizeHandle).filter(Boolean))];
  if (!unique.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 6) {
    chunks.push(unique.slice(i, i + 6));
  }

  return chunks.slice(0, 2).map((group) => {
    const from = group.map((h) => `from:${h}`).join(' OR ');
    return q
      ? `site:x.com (${from}) ${q}`
      : `site:x.com (${from})`;
  });
}

function collectStatusUrls(results: WebSearchResult[], allow: Set<string>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const row of results) {
    const id = extractStatusId(row.url);
    if (!id || seen.has(id)) continue;
    const handle = extractHandleFromUrl(row.url);
    if (handle && !isAllowedHandle(handle, allow)) continue;
    if (!handle && !allow.size) continue;
    seen.add(id);
    urls.push(row.url.split('?')[0]);
  }
  return urls;
}

/**
 * Recherche des posts X de comptes crédibles (et handles explicitement demandés).
 * `queries` : sujets et/ou @handles (ex. ["Kinshasa", "@RadioOkapi élections"]).
 */
export async function searchCredibleX(
  queries: string[],
  options?: { freshness?: SearchFreshness; maxPosts?: number; extraHandles?: string[] }
): Promise<{ results: WebSearchResult[]; posts: XPostSource[]; errors: string[] }> {
  const maxPosts = Math.min(Math.max(options?.maxPosts ?? 4, 1), 6);
  const errors: string[] = [];
  const topics: string[] = [];
  const requestedHandles: string[] = [];

  for (const raw of queries.slice(0, 4)) {
    const text = raw.trim();
    if (!text) continue;
    const handlesInQuery = [...text.matchAll(/@([A-Za-z0-9_]{2,30})/g)].map((m) => m[1]);
    requestedHandles.push(...handlesInQuery);
    const cleaned = text.replace(/@([A-Za-z0-9_]{2,30})/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned) topics.push(cleaned);
    else if (handlesInQuery.length) topics.push('');
  }

  const allowList = [
    ...CREDIBLE_X_HANDLES,
    ...(options?.extraHandles || []),
    ...requestedHandles,
  ].map(normalizeHandle);
  const allow = new Set(allowList.filter(Boolean));

  const searchQueries = (topics.length ? topics : [''])
    .slice(0, 2)
    .flatMap((topic) => buildXQueries(topic, [...allow].slice(0, 18)));

  const results: WebSearchResult[] = [];
  const seenResult = new Set<string>();

  for (const query of searchQueries.slice(0, 3)) {
    try {
      const search = await searchWeb(query, {
        limit: 8,
        freshness: options?.freshness ?? 'week',
      });
      errors.push(...search.errors);
      for (const row of search.results) {
        const key = row.url.replace(/[#?].*$/, '');
        if (seenResult.has(key)) continue;
        seenResult.add(key);
        results.push({ ...row, engine: row.engine });
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'recherche X impossible');
    }
  }

  const statusUrls = collectStatusUrls(results, allow).slice(0, maxPosts + 2);
  const posts: XPostSource[] = [];
  const settled = await Promise.allSettled(
    statusUrls.map((url) => {
      const id = extractStatusId(url);
      if (!id) return Promise.reject(new Error('id manquant'));
      return fetchFxTweet(id);
    })
  );

  for (const outcome of settled) {
    if (posts.length >= maxPosts) break;
    if (outcome.status !== 'fulfilled' || !outcome.value) {
      if (outcome.status === 'rejected') {
        errors.push(outcome.reason instanceof Error ? outcome.reason.message : 'lecture X');
      }
      continue;
    }
    const post = outcome.value;
    if (!isAllowedHandle(post.handle, allow)) continue;
    posts.push(post);
  }

  return { results: results.filter((row) => extractStatusId(row.url)), posts, errors };
}

/** Enrichit la lecture d'une URL X/Twitter via FxTwitter (repli oEmbed géré ailleurs). */
export async function fetchXPostByUrl(url: string): Promise<XPostSource | null> {
  const id = extractStatusId(url);
  if (!id) return null;
  try {
    return await fetchFxTweet(id);
  } catch {
    return null;
  }
}
