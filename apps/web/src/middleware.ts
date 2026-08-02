import { NextRequest, NextResponse } from 'next/server';
import { resolveWpRedirect } from '@/lib/wp-redirects';

export function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|uploads|wp-content|api).*)'],
};
