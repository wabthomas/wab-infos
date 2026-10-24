import { revalidatePath } from 'next/cache';
import { normalizeSiteSeoSettings } from '@wab-infos/shared';
import { canonicalizeCategorySlug, siteConfig } from '@/config/site';
import { purgeCloudflareUrls, type CloudflarePurgeResult } from '@/lib/cache/cloudflare';
import { articleGoogleIndexingUrl, notifyGoogleIndexing } from '@/lib/google-indexing';
import { articleIndexNowUrls, notifyIndexNow } from '@/lib/indexnow';
import { getSiteSettings } from '@/lib/site-settings.server';

/**
 * Chaîne d’indexation déclenchée à la publication d’un article.
 *
 * Ordre voulu : rendre la page fraîche (ISR + CDN), puis prévenir les moteurs.
 * Un moteur qui crawle une page encore cachée 30 min perd tout le bénéfice.
 */

export interface PublishIndexingResult {
  ok: boolean;
  at: string;
  /** URLs publiques rafraîchies (utilisées pour la purge CDN). */
  urls: string[];
  revalidated: string[];
  indexNow: {
    enabled: boolean;
    ok: boolean;
    status: number | null;
    submitted: number;
  };
  google: {
    enabled: boolean;
    configured: boolean;
    ok: boolean;
    submitted: number;
    succeeded: number;
    failed: number;
    errors: string[];
  };
  cloudflare: CloudflarePurgeResult;
}

function safeRevalidate(path: string): boolean {
  try {
    revalidatePath(path);
    return true;
  } catch (error) {
    console.warn('[indexing] revalidatePath failed:', path, error);
    return false;
  }
}

/** Sitemaps, flux et accueil : toujours rafraîchis après une publication. */
function sharedPaths(): string[] {
  return ['/', '/sitemap.xml', '/sitemap-news.xml', '/sitemap-videos.xml', '/feed.xml', '/feed-tv.xml'];
}

function sharedUrls(): string[] {
  return [
    siteConfig.url,
    `${siteConfig.url}/`,
    `${siteConfig.url}/sitemap.xml`,
    `${siteConfig.url}/sitemap-news.xml`,
    `${siteConfig.url}/sitemap-videos.xml`,
    `${siteConfig.url}/feed.xml`,
    `${siteConfig.url}/feed-tv.xml`,
  ];
}

export async function indexArticlePublication(input: {
  slug: string;
  category: string;
  previousCategory?: string | null;
}): Promise<PublishIndexingResult> {
  const slug = input.slug.trim();
  const category = canonicalizeCategorySlug(input.category.trim());
  const previousCategory = input.previousCategory?.trim()
    ? canonicalizeCategorySlug(input.previousCategory.trim())
    : null;

  const articlePath = `/${category}/${slug}`;
  const articleUrl = `${siteConfig.url}${articlePath}`;

  const paths = [
    articlePath,
    ...(previousCategory && previousCategory !== category
      ? [`/${previousCategory}/${slug}`, `/${previousCategory}`]
      : []),
    `/${category}`,
    // Chunk 0 = articles triés par updatedAt desc → le nouveau article y entre.
    '/sitemaps/articles/0',
    ...sharedPaths(),
  ];

  const revalidated = paths.filter((path) => safeRevalidate(path));
  const urls = [
    ...new Set([
      articleUrl,
      `${siteConfig.url}/${category}`,
      ...(previousCategory && previousCategory !== category
        ? [`${siteConfig.url}/${previousCategory}/${slug}`, `${siteConfig.url}/${previousCategory}`]
        : []),
      ...articleIndexNowUrls(category, slug),
      ...sharedUrls(),
    ]),
  ];

  let seo = normalizeSiteSeoSettings({});
  try {
    seo = normalizeSiteSeoSettings((await getSiteSettings()).chrome.seo);
  } catch (error) {
    console.warn('[indexing] site settings unavailable, defaults used:', error);
  }

  const indexNowEnabled = seo.indexNowEnabled !== false;
  const googleEnabled = seo.googleIndexingEnabled !== false;

  const [indexNow, google, cloudflare] = await Promise.all([
    indexNowEnabled
      ? notifyIndexNow(articleIndexNowUrls(category, slug))
      : Promise.resolve({ ok: false, status: undefined }),
    googleEnabled
      ? notifyGoogleIndexing([articleGoogleIndexingUrl(category, slug)])
      : Promise.resolve({
          ok: false as const,
          configured: false,
          submitted: 0,
          succeeded: 0,
          failed: 0,
          errors: [] as string[],
        }),
    purgeCloudflareUrls(urls),
  ]);

  return {
    ok: Boolean(indexNow.ok || google.ok || cloudflare.ok),
    at: new Date().toISOString(),
    urls,
    revalidated,
    indexNow: {
      enabled: indexNowEnabled,
      ok: Boolean(indexNow.ok),
      status: indexNow.status ?? null,
      submitted: articleIndexNowUrls(category, slug).length,
    },
    google: {
      enabled: googleEnabled,
      configured: google.configured,
      ok: Boolean(google.ok),
      submitted: google.submitted,
      succeeded: google.succeeded,
      failed: google.failed,
      errors: google.errors ?? [],
    },
    cloudflare,
  };
}

export async function indexVideoPublication(input: {
  videoId: string;
}): Promise<PublishIndexingResult> {
  const videoPath = `/tv/v/${input.videoId}`;
  const paths = [videoPath, '/tv', '/sitemap.xml', '/sitemap-videos.xml', '/feed-tv.xml', '/'];
  const revalidated = paths.filter((path) => safeRevalidate(path));
  const urls = [
    `${siteConfig.url}${videoPath}`,
    `${siteConfig.url}/tv`,
    ...sharedUrls(),
  ];

  const cloudflare = await purgeCloudflareUrls(urls);

  return {
    ok: cloudflare.configured ? cloudflare.ok : revalidated.length > 0,
    at: new Date().toISOString(),
    urls,
    revalidated,
    indexNow: { enabled: false, ok: false, status: null, submitted: 0 },
    google: {
      enabled: false,
      configured: false,
      ok: false,
      submitted: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    },
    cloudflare,
  };
}
