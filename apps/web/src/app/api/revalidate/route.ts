import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { normalizeSiteSeoSettings } from '@wab-infos/shared';
import { articleIndexNowUrls, notifyIndexNow } from '@/lib/indexnow';
import {
  articleGoogleIndexingUrl,
  notifyGoogleIndexing,
} from '@/lib/google-indexing';
import { getSiteSettings } from '@/lib/site-settings.server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, type, slug, category } = body as {
      path?: string;
      type?: string;
      slug?: string;
      category?: string;
    };

    if (path) {
      revalidatePath(path);
    }

    if (type === 'article' && slug && category) {
      revalidatePath(`/${category}/${slug}`);
      revalidatePath(`/${category}`);
      revalidatePath('/');
      const seo = normalizeSiteSeoSettings((await getSiteSettings()).chrome.seo);
      if (seo.indexNowEnabled !== false) {
        void notifyIndexNow(articleIndexNowUrls(category, slug));
      }
      if (seo.googleIndexingEnabled !== false) {
        void notifyGoogleIndexing([articleGoogleIndexingUrl(category, slug)]);
      }
    }

    if (type === 'article') {
      revalidatePath('/sitemap.xml');
      revalidatePath('/sitemap-news.xml');
      revalidatePath('/feed.xml');
    }

    if (type === 'video') {
      revalidatePath('/sitemap.xml');
      revalidatePath('/sitemap-videos.xml');
      revalidatePath('/feed-tv.xml');
      revalidatePath('/tv');
      if (slug) {
        revalidatePath(`/tv/v/${slug}`);
      }
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
