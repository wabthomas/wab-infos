import { siteConfig } from '@/config/site';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function getIndexNowConfig(): { key: string; host: string; keyLocation: string } | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return null;

  let host: string;
  try {
    host = new URL(siteConfig.url).host;
  } catch {
    return null;
  }

  return {
    key,
    host,
    keyLocation: `${siteConfig.url}/${key}.txt`,
  };
}

/** Notifie Bing / moteurs IndexNow (best-effort, non bloquant). */
export async function notifyIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number }> {
  const config = getIndexNowConfig();
  if (!config) return { ok: false };

  const urlList = [...new Set(urls.filter(Boolean))].slice(0, 10_000);
  if (urlList.length === 0) return { ok: false };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: config.host,
        key: config.key,
        keyLocation: config.keyLocation,
        urlList,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('[indexnow] submit failed:', response.status, body.slice(0, 200));
      return { ok: false, status: response.status };
    }

    return { ok: true, status: response.status };
  } catch (err) {
    console.warn('[indexnow] submit error:', err);
    return { ok: false };
  }
}

/** URLs à signaler lors de la publication d'un article. */
export function articleIndexNowUrls(category: string, slug: string): string[] {
  const base = siteConfig.url;
  return [
    `${base}/${category}/${slug}`,
    `${base}/${category}`,
    base,
    `${base}/feed.xml`,
    `${base}/sitemap-news.xml`,
  ];
}
