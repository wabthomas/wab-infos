import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { siteConfig } from '@/config/site';
import { purgeCloudflareUrls } from '@/lib/cache/cloudflare';
import {
  indexArticlePublication,
  indexVideoPublication,
  type PublishIndexingResult,
} from '@/lib/seo/publish-indexing';

const REFRESH_ONLY_PATHS = [
  '/',
  '/sitemap.xml',
  '/sitemap-news.xml',
  '/sitemap-videos.xml',
  '/feed.xml',
  '/feed-tv.xml',
];

const REFRESH_ONLY_URLS = REFRESH_ONLY_PATHS.map((path) =>
  path === '/' ? siteConfig.url : `${siteConfig.url}${path}`
);

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, type, slug, category, previousCategory } = body as {
      path?: string;
      type?: string;
      slug?: string;
      category?: string;
      previousCategory?: string;
    };

    if (path) {
      revalidatePath(path);
    }

    let indexing: PublishIndexingResult | null = null;

    if (type === 'article' && slug && category) {
      indexing = await indexArticlePublication({ slug, category, previousCategory });
    } else if (type === 'video' && slug) {
      indexing = await indexVideoPublication({ videoId: slug });
    } else if (type === 'article' || type === 'video') {
      // Suppression / dépublication sans slug : rafraîchir l’ensemble des flux.
      for (const refreshPath of REFRESH_ONLY_PATHS) {
        revalidatePath(refreshPath);
      }
      const cloudflare = await purgeCloudflareUrls(REFRESH_ONLY_URLS);
      indexing = {
        ok: cloudflare.ok,
        at: new Date().toISOString(),
        urls: REFRESH_ONLY_URLS,
        revalidated: REFRESH_ONLY_PATHS,
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

    return NextResponse.json({ revalidated: true, now: Date.now(), indexing });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
