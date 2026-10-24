/**
 * Purge du cache CDN Cloudflare à la publication.
 *
 * `revalidatePath()` ne vide que le cache Next.js : le HTML, les sitemaps et le
 * RSS restent servis périmés par Cloudflare (s-maxage). On purge donc les URLs
 * exactes pour que Googlebot / Bingbot / IndexNow voient la version fraîche.
 */

const PURGE_ENDPOINT = 'https://api.cloudflare.com/client/v4/zones';

/** Cloudflare accepte au plus 30 fichiers par appel `purge_cache`. */
const MAX_URLS_PER_BATCH = 30;

interface CloudflarePurgeConfig {
  zoneId: string;
  apiToken: string;
}

function getPurgeConfig(): CloudflarePurgeConfig | null {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!zoneId || !apiToken) return null;
  return { zoneId, apiToken };
}

export function isCloudflarePurgeConfigured(): boolean {
  return getPurgeConfig() != null;
}

export interface CloudflarePurgeResult {
  configured: boolean;
  ok: boolean;
  /** URLs réellement envoyées à Cloudflare. */
  purged: number;
  batches: number;
  errors: string[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

async function purgeBatch(
  config: CloudflarePurgeConfig,
  urls: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${PURGE_ENDPOINT}/${encodeURIComponent(config.zoneId)}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (response.ok) return { ok: true };

    const body = await response.text().catch(() => '');
    return {
      ok: false,
      error: `HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ''}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'network error',
    };
  }
}

/**
 * Purge une liste d’URLs du cache Cloudflare.
 * Best-effort : sans configuration, retourne `configured: false` sans échouer.
 */
export async function purgeCloudflareUrls(urls: string[]): Promise<CloudflarePurgeResult> {
  const config = getPurgeConfig();
  if (!config) {
    return { configured: false, ok: false, purged: 0, batches: 0, errors: [] };
  }

  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { configured: true, ok: true, purged: 0, batches: 0, errors: [] };
  }

  const batches = chunk(unique, MAX_URLS_PER_BATCH);
  const results = await Promise.all(batches.map((batch) => purgeBatch(config, batch)));

  const errors = results
    .map((result) => result.error)
    .filter((error): error is string => Boolean(error));

  if (errors.length > 0) {
    console.warn('[cloudflare] purge partielle:', errors.slice(0, 3).join(' | '));
  }

  return {
    configured: true,
    ok: errors.length === 0,
    purged: unique.length,
    batches: batches.length,
    errors: errors.slice(0, 5),
  };
}
