import { NextResponse } from 'next/server';
import { normalizeSiteSeoSettings } from '@wab-infos/shared';
import { articleIndexNowUrls, notifyIndexNow } from '@/lib/indexnow';
import {
  articleGoogleIndexingUrl,
  notifyGoogleIndexing,
} from '@/lib/google-indexing';
import { siteConfig } from '@/config/site';
import { purgeCloudflareUrls } from '@/lib/cache/cloudflare';
import { getIndexingHealth } from '@/lib/seo/health';
import { getSiteSettings } from '@/lib/site-settings.server';

const ALWAYS_PURGE = [
  siteConfig.url,
  `${siteConfig.url}/`,
  `${siteConfig.url}/sitemap.xml`,
  `${siteConfig.url}/sitemap-news.xml`,
  `${siteConfig.url}/sitemap-videos.xml`,
  `${siteConfig.url}/feed.xml`,
];

/**
 * IndexNow + Google Indexing API + purge CDN — secret partagé avec /api/revalidate.
 * Body: {
 *   urls?: string[],
 *   articles?: { category: string; slug: string }[],
 *   type?: 'URL_UPDATED' | 'URL_DELETED'
 * }
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      urls?: string[];
      articles?: { category?: string; slug?: string }[];
      type?: 'URL_UPDATED' | 'URL_DELETED';
    };

    const seo = normalizeSiteSeoSettings((await getSiteSettings()).chrome.seo);
    const indexNowUrls: string[] = [];
    const googleUrls: string[] = [];

    if (Array.isArray(body.urls)) {
      for (const url of body.urls) {
        if (typeof url === 'string' && url.trim()) {
          indexNowUrls.push(url.trim());
          googleUrls.push(url.trim());
        }
      }
    }

    if (Array.isArray(body.articles)) {
      for (const item of body.articles) {
        const category = item.category?.trim();
        const slug = item.slug?.trim();
        if (category && slug) {
          indexNowUrls.push(...articleIndexNowUrls(category, slug));
          googleUrls.push(articleGoogleIndexingUrl(category, slug));
        }
      }
    }

    const uniqueIndexNow = [...new Set(indexNowUrls)].slice(0, 10_000);
    if (uniqueIndexNow.length === 0) {
      uniqueIndexNow.push(
        `${siteConfig.url}/`,
        `${siteConfig.url}/sitemap.xml`,
        `${siteConfig.url}/sitemap-news.xml`,
        `${siteConfig.url}/feed.xml`
      );
    }

    const uniqueGoogle = [...new Set(googleUrls)].slice(0, 40);
    const googleType = body.type === 'URL_DELETED' ? 'URL_DELETED' : 'URL_UPDATED';

    const [indexNow, google, cloudflare] = await Promise.all([
      seo.indexNowEnabled !== false
        ? notifyIndexNow(uniqueIndexNow)
        : Promise.resolve({ ok: false as const, status: undefined }),
      seo.googleIndexingEnabled !== false && uniqueGoogle.length > 0
        ? notifyGoogleIndexing(uniqueGoogle, googleType)
        : Promise.resolve({
            ok: false as const,
            configured: false,
            submitted: 0,
            succeeded: 0,
            failed: 0,
          }),
      // Les sitemaps/feeds doivent refléter l’article tout de suite, même si le
      // HTML de l’article a déjà été coupé par la purge de /api/revalidate.
      purgeCloudflareUrls([...uniqueIndexNow, ...ALWAYS_PURGE]),
    ]);

    const ok = indexNow.ok || google.ok;
    return NextResponse.json({
      ok,
      submitted: uniqueIndexNow.length,
      indexNow: {
        ok: indexNow.ok,
        enabled: seo.indexNowEnabled !== false,
        status: indexNow.status ?? null,
        submitted: uniqueIndexNow.length,
      },
      google: {
        ok: google.ok,
        enabled: seo.googleIndexingEnabled !== false,
        configured: 'configured' in google ? google.configured : false,
        submitted: 'submitted' in google ? google.submitted : 0,
        succeeded: 'succeeded' in google ? google.succeeded : 0,
        failed: 'failed' in google ? google.failed : 0,
        errors: 'errors' in google ? google.errors ?? [] : [],
      },
      cloudflare,
      health: getIndexingHealth(),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
