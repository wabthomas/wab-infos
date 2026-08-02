import { NextRequest, NextResponse } from 'next/server';
import { isValidCategorySlug } from '@/config/site';
import { resolveWpRedirect } from '@/lib/wp-redirects';

const STRAPI_URL = (
  process.env.STRAPI_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  ''
).replace(/\/$/, '');
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';

/** Cache court en mémoire (middleware Node) pour limiter les appels Strapi. */
const slugExistsCache = new Map<string, { ok: boolean; exp: number }>();
const SLUG_CACHE_TTL_MS = 60_000;

async function publishedArticleExists(slug: string): Promise<boolean | null> {
  if (!STRAPI_URL) return null;

  const cached = slugExistsCache.get(slug);
  if (cached && cached.exp > Date.now()) return cached.ok;

  try {
    const params = new URLSearchParams({
      'filters[slug][$eq]': slug,
      'fields[0]': 'slug',
      'pagination[pageSize]': '1',
      status: 'published',
    });
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;

    const res = await fetch(`${STRAPI_URL}/api/articles?${params}`, {
      headers,
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: unknown[] };
    const ok = Array.isArray(json.data) && json.data.length > 0;
    slugExistsCache.set(slug, { ok, exp: Date.now() + SLUG_CACHE_TTL_MS });
    return ok;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';

  // Canonique HTTPS apex (complément Cloudflare Always HTTPS / www → apex)
  if (host === 'www.wab-infos.com') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = 'wab-infos.com';
    return NextResponse.redirect(url, 301);
  }

  const indexNowKey = process.env.INDEXNOW_KEY?.trim();
  if (indexNowKey && pathname === `/${indexNowKey}.txt`) {
    return new NextResponse(`${indexNowKey}\n`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const legacyTarget = resolveWpRedirect(pathname);
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyTarget, request.url), 301);
  }

  if (pathname.endsWith('/') && pathname.length > 1) {
    return NextResponse.redirect(new URL(pathname.slice(0, -1), request.url), 301);
  }

  // Soft-404 Next sur [category]/[slug] → forcer un vrai 404 via rewrite.
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 2 && isValidCategorySlug(segments[0])) {
    const exists = await publishedArticleExists(segments[1]);
    if (exists === false) {
      return NextResponse.rewrite(new URL('/hard-404', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|uploads|wp-content|api|hard-404).*)'],
};
